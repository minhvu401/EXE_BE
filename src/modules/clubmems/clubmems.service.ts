/* eslint-disable @typescript-eslint/no-unsafe-enum-comparison */
// club-member.service.ts
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ClubMember } from './schemas/club-member.schema';
import { PendingAction } from './schemas/pending-action.schema';
import { MemberRole } from './enum/role.enum';
import { User } from '../auth/schemas/user.schema';
import { RemoveMemberDto } from './dto/remove-member.dto';
import { UpdateMemberRoleDto } from './dto/update-member-role.dto';
import { GetMembersQueryDto } from './dto/get-members.dto';
import { MailService } from '../mail/mail.service';
import { ApprovalUtils } from './utils/approval.utils';
import { Role } from '../auth/enum/role.enum';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ClubMemberService {
  private readonly logger = new Logger(ClubMemberService.name);

  constructor(
    @InjectModel(ClubMember.name) private clubMemberModel: Model<ClubMember>,
    @InjectModel(PendingAction.name)
    private pendingActionModel: Model<PendingAction>,
    @InjectModel(User.name) private userModel: Model<User>,
    private mailService: MailService,
    private configService: ConfigService,
  ) {}

  // Get all members of a club with filters
  async getClubMembers(clubId: string, query: GetMembersQueryDto) {
    // Validate club
    const club = await this.userModel.findById(clubId);
    if (!club || club.role !== Role.CLUB) {
      throw new NotFoundException('Không tìm thấy câu lạc bộ');
    }

    const clubMembers = await this.clubMemberModel.findOne({
      clubId: new Types.ObjectId(clubId),
    });

    if (!clubMembers) {
      return {
        total: 0,
        active: 0,
        inactive: 0,
        members: [],
      };
    }

    let members = [...clubMembers.users];

    // Filter by status
    if (query.status === 'active') {
      members = members.filter((m) => m.isActive === true);
    } else if (query.status === 'inactive') {
      members = members.filter((m) => m.isActive === false);
    }

    if (query.role) {
      members = members.filter((m) => m.role != null && m.role === query.role);
    }

    // Search by name or email
    if (query.search) {
      const searchLower = query.search.toLowerCase();
      members = members.filter(
        (m) =>
          m.fullName.toLowerCase().includes(searchLower) ||
          m.email.toLowerCase().includes(searchLower),
      );
    }

    // Sort
    switch (query.sortBy) {
      case 'oldest':
        members.sort((a, b) => a.joinedAt.getTime() - b.joinedAt.getTime());
        break;
      case 'name':
        members.sort((a, b) => a.fullName.localeCompare(b.fullName));
        break;
      case 'newest':
      default:
        members.sort((a, b) => b.joinedAt.getTime() - a.joinedAt.getTime());
        break;
    }

    const activeCount = clubMembers.users.filter((m) => m.isActive).length;
    const inactiveCount = clubMembers.users.filter((m) => !m.isActive).length;

    return {
      total: clubMembers.users.length,
      active: activeCount,
      inactive: inactiveCount,
      filtered: members.length,
      members,
    };
  }

  // Get member details
  async getMemberDetails(clubId: string, memberId: string) {
    const clubMembers = await this.clubMemberModel.findOne({
      clubId: new Types.ObjectId(clubId),
    });

    if (!clubMembers) {
      throw new NotFoundException('Không tìm thấy dữ liệu thành viên');
    }

    const member = clubMembers.users.find(
      (m) => m.userId.toString() === memberId,
    );

    if (!member) {
      throw new NotFoundException('Không tìm thấy thành viên trong câu lạc bộ');
    }

    // Get full user data
    const user = await this.userModel
      .findById(memberId)
      .select('-password')
      .exec();

    return {
      memberInfo: member,
      fullProfile: user,
    };
  }

  // Remove member from club
  async removeMember(
    clubId: string,
    removeDto: RemoveMemberDto,
    removedById: string,
  ) {
    // Validate club
    const club = await this.userModel.findById(clubId);
    if (!club || club.role !== Role.CLUB) {
      throw new ForbiddenException('Chỉ câu lạc bộ mới có thể xóa thành viên');
    }

    const clubMembers = await this.clubMemberModel.findOne({
      clubId: new Types.ObjectId(clubId),
    });

    if (!clubMembers) {
      throw new NotFoundException('Không tìm thấy dữ liệu thành viên');
    }

    // Find member
    const memberIndex = clubMembers.users.findIndex(
      (m) => m.userId.toString() === removeDto.userId && m.isActive === true,
    );

    if (memberIndex === -1) {
      throw new NotFoundException('Không tìm thấy thành viên hoặc đã bị xóa');
    }

    const member = clubMembers.users[memberIndex];

    // Cannot remove yourself (club owner)
    if (removeDto.userId === clubId) {
      throw new BadRequestException(
        'Không thể tự xóa bản thân khỏi câu lạc bộ',
      );
    }

    // Create pending action
    const pendingAction = await this.createPendingActionAndNotifyAdmins(
      clubId,
      'remove_member',
      removeDto.userId,
      removedById,
      { reason: removeDto.reason },
    );

    return {
      message: 'Yêu cầu xóa thành viên đang chờ xác nhận từ admin',
      pendingAction: {
        id: pendingAction._id,
        actionType: pendingAction.actionType,
        token: pendingAction.approvalToken,
        targetMemberId: member.userId,
        memberName: member.fullName,
        email: member.email,
        reason: removeDto.reason,
        createdAt: pendingAction.createdAt,
        expiresAt: pendingAction.expiresAt,
      },
    };
  }

  // Update member role
  async updateMemberRole(
    clubId: string,
    updateDto: UpdateMemberRoleDto,
    updatedById: string,
  ) {
    // Validate club
    const club = await this.userModel.findById(clubId);
    if (!club || club.role !== Role.CLUB) {
      throw new ForbiddenException(
        'Chỉ câu lạc bộ mới có thể cập nhật vai trò',
      );
    }

    const clubMembers = await this.clubMemberModel.findOne({
      clubId: new Types.ObjectId(clubId),
    });

    if (!clubMembers) {
      throw new NotFoundException('Không tìm thấy dữ liệu thành viên');
    }

    // Find member
    const memberIndex = clubMembers.users.findIndex(
      (m) => m.userId.toString() === updateDto.userId && m.isActive === true,
    );

    if (memberIndex === -1) {
      throw new NotFoundException('Không tìm thấy thành viên hoạt động');
    }

    const member = clubMembers.users[memberIndex];

    // Cannot update yourself (club owner)
    if (updateDto.userId === clubId) {
      throw new BadRequestException(
        'Không thể thay đổi vai trò của chính mình',
      );
    }

    const oldRole = member.role || MemberRole.MEMBER;

    // Create pending action
    const pendingAction = await this.createPendingActionAndNotifyAdmins(
      clubId,
      'update_role',
      updateDto.userId,
      updatedById,
      { newRole: updateDto.newRole, oldRole },
    );

    return {
      message: 'Yêu cầu cập nhật vai trò đang chờ xác nhận từ admin',
      pendingAction: {
        id: pendingAction._id,
        actionType: pendingAction.actionType,
        token: pendingAction.approvalToken,
        targetMemberId: member.userId,
        memberName: member.fullName,
        email: member.email,
        oldRole,
        newRole: updateDto.newRole,
        createdAt: pendingAction.createdAt,
        expiresAt: pendingAction.expiresAt,
      },
    };
  }

  // Get member statistics
  async getMemberStatistics(clubId: string) {
    const club = await this.userModel.findById(clubId);
    if (!club || club.role !== Role.CLUB) {
      throw new NotFoundException('Không tìm thấy câu lạc bộ');
    }

    const clubMembers = await this.clubMemberModel.findOne({
      clubId: new Types.ObjectId(clubId),
    });

    if (!clubMembers) {
      return {
        total: 0,
        active: 0,
        inactive: 0,
        byRole: {
          admin: 0,
          moderator: 0,
          member: 0,
        },
        recentJoins: [],
        growthTrend: [],
      };
    }

    const activeMembers = clubMembers.users.filter((m) => m.isActive);
    const inactiveMembers = clubMembers.users.filter((m) => !m.isActive);

    // Count by role
    const byRole = {
      admin: activeMembers.filter((m) => m.role === MemberRole.ADMIN).length,
      moderator: activeMembers.filter((m) => m.role === MemberRole.MODERATOR)
        .length,
      member: activeMembers.filter((m) => m.role === MemberRole.MEMBER).length,
    };

    // Recent joins (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentJoins = activeMembers
      .filter((m) => m.joinedAt >= thirtyDaysAgo)
      .sort((a, b) => b.joinedAt.getTime() - a.joinedAt.getTime())
      .slice(0, 10)
      .map((m) => ({
        userId: m.userId,
        fullName: m.fullName,
        email: m.email,
        avatarUrl: m.avatarUrl,
        joinedAt: m.joinedAt,
      }));

    // Growth trend (last 12 months)
    const growthTrend = this.calculateGrowthTrend(clubMembers.users);

    // Retention rate (members who stayed > 3 months)
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    const membersOver3Months = activeMembers.filter(
      (m) => m.joinedAt <= threeMonthsAgo,
    );
    const retentionRate =
      clubMembers.users.length > 0
        ? (membersOver3Months.length / clubMembers.users.length) * 100
        : 0;

    return {
      total: clubMembers.users.length,
      active: activeMembers.length,
      inactive: inactiveMembers.length,
      byRole,
      recentJoins,
      growthTrend,
      retentionRate: Math.round(retentionRate * 100) / 100,
    };
  }

  // Calculate growth trend for last 12 months
  private calculateGrowthTrend(
    members: Array<{
      joinedAt: Date;
      isActive: boolean;
      outDate?: Date;
    }>,
  ): { month: string; count: number }[] {
    const now = new Date();
    const trend: { month: string; count: number }[] = [];

    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthName = date.toLocaleDateString('vi-VN', {
        year: 'numeric',
        month: 'short',
      });

      // Count active members at the end of that month
      const nextMonth = new Date(date.getFullYear(), date.getMonth() + 1, 1);
      const count = members.filter((m) => {
        const joinedBeforeNextMonth = m.joinedAt < nextMonth;
        const stillActiveOrLeftAfterMonth =
          m.isActive || !m.outDate || m.outDate >= nextMonth;
        return joinedBeforeNextMonth && stillActiveOrLeftAfterMonth;
      }).length;

      trend.push({ month: monthName, count });
    }

    return trend;
  }

  // Export members list (CSV format data)
  async exportMembersList(
    clubId: string,
    status: 'active' | 'inactive' | 'all' = 'all',
  ) {
    const club = await this.userModel.findById(clubId);
    if (!club || club.role !== Role.CLUB) {
      throw new NotFoundException('Không tìm thấy câu lạc bộ');
    }

    const clubMembers = await this.clubMemberModel.findOne({
      clubId: new Types.ObjectId(clubId),
    });

    if (!clubMembers) {
      return [];
    }

    let members = [...clubMembers.users];

    // Filter by status
    if (status === 'active') {
      members = members.filter((m) => m.isActive === true);
    } else if (status === 'inactive') {
      members = members.filter((m) => m.isActive === false);
    }

    // Format data for export
    const exportData = members.map((m) => ({
      'Họ và tên': m.fullName,
      Email: m.email,
      'Số điện thoại': m.phoneNumber || 'N/A',
      Trường: m.school || 'N/A',
      'Chuyên ngành': m.major || 'N/A',
      Năm: m.year || 'N/A',
      'Vai trò': m.role,
      'Ngày tham gia': m.joinedAt.toLocaleDateString('vi-VN'),
      'Trạng thái': m.isActive ? 'Hoạt động' : 'Đã rời',
      'Ngày rời': m.outDate ? m.outDate.toLocaleDateString('vi-VN') : 'N/A',
      'Lý do rời': m.removeReason || 'N/A',
    }));

    return exportData;
  }

  // Check if user is member of club
  async isMemberOfClub(userId: string, clubId: string): Promise<boolean> {
    const clubMembers = await this.clubMemberModel.findOne({
      clubId: new Types.ObjectId(clubId),
    });

    if (!clubMembers) return false;

    return clubMembers.users.some(
      (m) => m.userId.toString() === userId && m.isActive === true,
    );
  }

  // Get clubs that user is member of
  async getUserClubs(userId: string, status: 'active' | 'all' = 'active') {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('Không tìm thấy người dùng');
    }

    if (!user.clubJoined || user.clubJoined.length === 0) {
      return {
        total: 0,
        clubs: [],
      };
    }

    let clubJoined = [...user.clubJoined];

    // Filter by status
    if (status === 'active') {
      clubJoined = clubJoined.filter((c) => c.isActive === true);
    }

    // Get club details
    const clubIds = clubJoined.map((c) => c.clubId);
    const clubs = await this.userModel
      .find({ _id: { $in: clubIds }, role: Role.CLUB })
      .select('fullName avatarUrl category description rating')
      .exec();

    // Merge club details with join info
    const clubsWithJoinInfo = clubJoined.map((joinInfo) => {
      const club = clubs.find(
        (c) => c._id.toString() === joinInfo.clubId.toString(),
      );
      return {
        clubId: joinInfo.clubId,
        clubInfo: club,
        joinedAt: joinInfo.joinedAt,
        isActive: joinInfo.isActive,
        outDate: joinInfo.outDate,
      };
    });

    return {
      total: clubJoined.length,
      clubs: clubsWithJoinInfo,
    };
  }

  // Helper: Create pending action and send approval emails
  private async createPendingActionAndNotifyAdmins(
    clubId: string,
    actionType: 'update_member' | 'remove_member' | 'update_role',
    targetMemberId: string,
    initiatedById: string,
    actionData: Record<string, any>,
  ): Promise<PendingAction> {
    // Get all admins in club
    const clubMembers = await this.clubMemberModel.findOne({
      clubId: new Types.ObjectId(clubId),
    });

    if (!clubMembers) {
      throw new NotFoundException('Không tìm thấy dữ liệu thành viên');
    }

    const admins = clubMembers.users.filter(
      (m) => m.role === MemberRole.ADMIN && m.isActive === true,
    );

    if (admins.length === 0) {
      throw new BadRequestException(
        'Không có admin nào trong câu lạc bộ để xác nhận',
      );
    }

    // Create pending action
    const approvalToken = ApprovalUtils.generateApprovalToken();
    const pendingAction = new this.pendingActionModel({
      clubId: new Types.ObjectId(clubId),
      actionType,
      targetMemberId: new Types.ObjectId(targetMemberId),
      initiatedById: new Types.ObjectId(initiatedById),
      actionData,
      adminApprovers: [],
      approvalToken,
    });

    await pendingAction.save();

    this.logger.log(
      `Pending ${actionType} action created. Waiting for ${admins.length} admins approval`,
    );

    return pendingAction;
  }

  // Approve pending action
  async approvePendingAction(approvalToken: string, adminId: string) {
    // Verify token
    if (!ApprovalUtils.verifyApprovalToken(approvalToken)) {
      throw new BadRequestException('Token xác nhận không hợp lệ');
    }

    // Find pending action
    const pendingAction = await this.pendingActionModel.findOne({
      approvalToken,
    });

    if (!pendingAction) {
      throw new NotFoundException(
        'Yêu cầu xác nhận không tồn tại hoặc đã hết hạn',
      );
    }

    // Check expiration
    if (new Date() > pendingAction.expiresAt) {
      pendingAction.isRejected = true;
      await pendingAction.save();
      throw new BadRequestException('Yêu cầu xác nhận đã hết hạn');
    }

    // Check if already completed or rejected
    if (pendingAction.isCompleted || pendingAction.isRejected) {
      throw new BadRequestException('Yêu cầu này đã được xử lý');
    }

    // Verify admin is part of club
    const clubMembers = await this.clubMemberModel.findOne({
      clubId: pendingAction.clubId,
    });

    if (!clubMembers) {
      throw new NotFoundException('Không tìm thấy dữ liệu thành viên');
    }

    const adminMember = clubMembers.users.find(
      (m) => m.userId.toString() === adminId && m.role === MemberRole.ADMIN,
    );

    if (!adminMember) {
      throw new ForbiddenException('Bạn không có quyền xác nhận yêu cầu này');
    }

    // Mark as approved and execute action
    pendingAction.approvedBy = new Types.ObjectId(adminId);
    pendingAction.approvedAt = new Date();
    pendingAction.isCompleted = true;
    await pendingAction.save();

    // Execute the action based on actionType
    switch (pendingAction.actionType) {
      case 'remove_member':
        await this.executeRemoveMemberAction(pendingAction);
        break;
      case 'update_role':
        await this.executeUpdateRoleAction(pendingAction);
        break;
      case 'update_member':
        await this.executeUpdateMemberAction(pendingAction);
        break;
    }

    return {
      message: 'Yêu cầu đã được xác nhận thành công',
      actionType: pendingAction.actionType,
      approvedAt: pendingAction.approvedAt,
    };
  }

  // Approve pending action by token (from email link, no admin ID verification)
  async approvePendingActionByToken(approvalToken: string) {
    // Verify token format
    if (!ApprovalUtils.verifyApprovalToken(approvalToken)) {
      throw new BadRequestException('Token xác nhận không hợp lệ');
    }

    // Find pending action
    const pendingAction = await this.pendingActionModel.findOne({
      approvalToken,
    });

    if (!pendingAction) {
      throw new NotFoundException(
        'Yêu cầu xác nhận không tồn tại hoặc đã hết hạn',
      );
    }

    // Check expiration
    if (new Date() > pendingAction.expiresAt) {
      pendingAction.isRejected = true;
      await pendingAction.save();
      throw new BadRequestException('Yêu cầu xác nhận đã hết hạn');
    }

    // Check if already completed or rejected
    if (pendingAction.isCompleted || pendingAction.isRejected) {
      throw new BadRequestException('Yêu cầu này đã được xử lý');
    }

    // Get first admin from club that will approve this
    const clubMembers = await this.clubMemberModel.findOne({
      clubId: pendingAction.clubId,
    });

    if (!clubMembers) {
      throw new NotFoundException('Không tìm thấy dữ liệu thành viên');
    }

    const firstAdmin = clubMembers.users.find(
      (m) => m.role === MemberRole.ADMIN,
    );

    if (!firstAdmin) {
      throw new ForbiddenException('Không tìm thấy admin để xác nhận');
    }

    // Mark as approved by first admin and execute action
    pendingAction.approvedBy = firstAdmin.userId;
    pendingAction.approvedAt = new Date();
    pendingAction.isCompleted = true;
    await pendingAction.save();

    // Execute the action based on actionType
    switch (pendingAction.actionType) {
      case 'remove_member':
        await this.executeRemoveMemberAction(pendingAction);
        break;
      case 'update_role':
        await this.executeUpdateRoleAction(pendingAction);
        break;
      case 'update_member':
        await this.executeUpdateMemberAction(pendingAction);
        break;
    }

    return {
      message: 'Yêu cầu đã được xác nhận thành công',
      actionType: pendingAction.actionType,
      approvedAt: pendingAction.approvedAt,
    };
  }

  // Helper: Execute remove member action
  private async executeRemoveMemberAction(
    pendingAction: PendingAction,
  ): Promise<void> {
    const clubMembers = await this.clubMemberModel.findOne({
      clubId: pendingAction.clubId,
    });

    if (!clubMembers) {
      throw new NotFoundException('Không tìm thấy dữ liệu thành viên');
    }

    const memberIndex = clubMembers.users.findIndex(
      (m) =>
        m.userId.toString() === pendingAction.targetMemberId.toString() &&
        m.isActive === true,
    );

    if (memberIndex === -1) {
      throw new NotFoundException('Thành viên không tồn tại hoặc đã bị xóa');
    }

    const member = clubMembers.users[memberIndex];

    // Update member status
    clubMembers.users[memberIndex].isActive = false;
    clubMembers.users[memberIndex].outDate = new Date();
    clubMembers.users[memberIndex].removeReason = pendingAction.actionData
      .reason as string;
    clubMembers.users[memberIndex].removedBy = pendingAction.approvedBy;
    clubMembers.quantity = clubMembers.users.filter((m) => m.isActive).length;

    await clubMembers.save();

    // Update user's clubJoined array
    const user = await this.userModel.findById(pendingAction.targetMemberId);
    if (user && user.clubJoined) {
      const clubIndex = user.clubJoined.findIndex(
        (c) =>
          c.clubId.toString() === pendingAction.clubId.toString() &&
          c.isActive === true,
      );
      if (clubIndex !== -1) {
        user.clubJoined[clubIndex].isActive = false;
        user.clubJoined[clubIndex].outDate = new Date();
        await user.save();
      }
    }

    // Get club info
    const club = await this.userModel.findById(pendingAction.clubId);
    if (!club) {
      throw new NotFoundException('Không tìm thấy câu lạc bộ');
    }

    // Send confirmation email
    await this.mailService.sendMemberRemovedEmail(
      member.email,
      member.fullName,
      club.fullName,
      pendingAction.actionData.reason,
    );

    this.logger.log(`Member ${member.fullName} removed successfully`);
  }

  // Helper: Execute update role action
  private async executeUpdateRoleAction(
    pendingAction: PendingAction,
  ): Promise<void> {
    const clubMembers = await this.clubMemberModel.findOne({
      clubId: pendingAction.clubId,
    });

    if (!clubMembers) {
      throw new NotFoundException('Không tìm thấy dữ liệu thành viên');
    }

    const memberIndex = clubMembers.users.findIndex(
      (m) =>
        m.userId.toString() === pendingAction.targetMemberId.toString() &&
        m.isActive === true,
    );

    if (memberIndex === -1) {
      throw new NotFoundException('Không tìm thấy thành viên hoạt động');
    }

    const member = clubMembers.users[memberIndex];
    const oldRole = member.role;

    // Update role
    clubMembers.users[memberIndex].role = pendingAction.actionData
      .newRole as MemberRole;
    await clubMembers.save();

    // Get club info
    const club = await this.userModel.findById(pendingAction.clubId);
    if (!club) {
      throw new NotFoundException('Không tìm thấy câu lạc bộ');
    }

    // Send confirmation email
    await this.mailService.sendRoleUpdatedEmail(
      member.email,
      member.fullName,
      club.fullName,
      pendingAction.actionData.newRole,
    );

    this.logger.log(
      `Member ${member.fullName} role updated from ${oldRole} to ${pendingAction.actionData.newRole}`,
    );
  }

  // Helper: Execute update member action
  private async executeUpdateMemberAction(
    pendingAction: PendingAction,
  ): Promise<void> {
    const clubMembers = await this.clubMemberModel.findOne({
      clubId: pendingAction.clubId,
    });

    if (!clubMembers) {
      throw new NotFoundException('Không tìm thấy dữ liệu thành viên');
    }

    const memberIndex = clubMembers.users.findIndex(
      (m) =>
        m.userId.toString() === pendingAction.targetMemberId.toString() &&
        m.isActive === true,
    );

    if (memberIndex === -1) {
      throw new NotFoundException('Thành viên không tồn tại');
    }

    // Update member data
    const updateData = pendingAction.actionData;
    clubMembers.users[memberIndex] = {
      ...clubMembers.users[memberIndex],
      ...updateData,
    };

    await clubMembers.save();

    this.logger.log(
      `Member ${clubMembers.users[memberIndex].fullName} updated successfully`,
    );
  }

  // Get pending actions for a club
  async getPendingActions(clubId: string, userId: string) {
    const club = await this.userModel.findById(clubId);
    if (!club || club.role !== Role.CLUB) {
      throw new NotFoundException('Không tìm thấy câu lạc bộ');
    }

    // Verify user is club owner or admin member
    const clubMembers = await this.clubMemberModel.findOne({
      clubId: new Types.ObjectId(clubId),
    });

    if (!clubMembers) {
      throw new NotFoundException('Không tìm thấy dữ liệu thành viên');
    }

    // Check if user is club owner
    const isClubOwner = userId === clubId;

    // Check if user is admin member
    const isAdminMember = clubMembers.users.some(
      (m) => m.userId.toString() === userId && m.role === MemberRole.ADMIN,
    );

    if (!isClubOwner && !isAdminMember) {
      throw new ForbiddenException(
        'Chỉ chủ club hoặc admin mới có thể xem yêu cầu chờ xác nhận',
      );
    }

    const pendingActions = await this.pendingActionModel.find({
      clubId: new Types.ObjectId(clubId),
      isCompleted: false,
      isRejected: false,
    });

    return pendingActions.map((action) => ({
      id: action._id,
      actionType: action.actionType,
      targetMemberId: action.targetMemberId,
      initiatedById: action.initiatedById,
      actionData: action.actionData,
      createdAt: action.createdAt,
      expiresAt: action.expiresAt,
      token: action.approvalToken,
    }));
  }

  // Approve pending action by ID (web app approval)
  async approvePendingActionById(
    pendingActionId: string,
    adminId: string,
  ): Promise<any> {
    const pendingAction =
      await this.pendingActionModel.findById(pendingActionId);

    if (!pendingAction) {
      throw new NotFoundException('Yêu cầu xác nhận không tồn tại');
    }

    // Check expiration
    if (new Date() > pendingAction.expiresAt) {
      pendingAction.isRejected = true;
      await pendingAction.save();
      throw new BadRequestException('Yêu cầu xác nhận đã hết hạn');
    }

    // Check if already completed or rejected
    if (pendingAction.isCompleted || pendingAction.isRejected) {
      throw new BadRequestException('Yêu cầu này đã được xử lý');
    }

    // Verify admin is part of club
    const clubMembers = await this.clubMemberModel.findOne({
      clubId: pendingAction.clubId,
    });

    if (!clubMembers) {
      throw new NotFoundException('Không tìm thấy dữ liệu thành viên');
    }

    const adminMember = clubMembers.users.find(
      (m) => m.userId.toString() === adminId && m.role === MemberRole.ADMIN,
    );

    if (!adminMember) {
      throw new ForbiddenException('Bạn không có quyền xác nhận yêu cầu này');
    }

    // Mark as approved and execute action
    pendingAction.approvedBy = new Types.ObjectId(adminId);
    pendingAction.approvedAt = new Date();
    pendingAction.isCompleted = true;
    await pendingAction.save();

    // Execute the action
    switch (pendingAction.actionType) {
      case 'remove_member':
        await this.executeRemoveMemberAction(pendingAction);
        break;
      case 'update_role':
        await this.executeUpdateRoleAction(pendingAction);
        break;
      case 'update_member':
        await this.executeUpdateMemberAction(pendingAction);
        break;
    }

    return {
      message: 'Yêu cầu đã được xác nhận thành công',
      actionType: pendingAction.actionType,
      approvedAt: pendingAction.approvedAt,
      approvedBy: adminMember.fullName,
    };
  }

  // Reject pending action by ID
  async rejectPendingActionById(
    pendingActionId: string,
    adminId: string,
    reason?: string,
  ): Promise<any> {
    const pendingAction =
      await this.pendingActionModel.findById(pendingActionId);

    if (!pendingAction) {
      throw new NotFoundException('Yêu cầu xác nhận không tồn tại');
    }

    // Check if already completed or rejected
    if (pendingAction.isCompleted || pendingAction.isRejected) {
      throw new BadRequestException('Yêu cầu này đã được xử lý');
    }

    // Verify admin is part of club
    const clubMembers = await this.clubMemberModel.findOne({
      clubId: pendingAction.clubId,
    });

    if (!clubMembers) {
      throw new NotFoundException('Không tìm thấy dữ liệu thành viên');
    }

    const adminMember = clubMembers.users.find(
      (m) => m.userId.toString() === adminId && m.role === MemberRole.ADMIN,
    );

    if (!adminMember) {
      throw new ForbiddenException('Bạn không có quyền từ chối yêu cầu này');
    }

    // Mark as rejected
    pendingAction.isRejected = true;
    pendingAction.rejectedBy = new Types.ObjectId(adminId);
    pendingAction.rejectedAt = new Date();
    if (reason) {
      pendingAction.rejectionReason = reason;
    }
    await pendingAction.save();

    return {
      message: 'Yêu cầu đã bị từ chối',
      actionType: pendingAction.actionType,
      rejectedAt: pendingAction.rejectedAt,
      rejectedBy: adminMember.fullName,
      rejectionReason: reason,
    };
  }
}
