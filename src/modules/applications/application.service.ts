/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
// application.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Application } from './schemas/application.schema';
import { ApplicationStatus } from './enum/application.enum';
import { User } from '../auth/schemas/user.schema';
import { ClubMember } from '../clubmems/schemas/club-member.schema';
import { CreateApplicationDto } from './dto/create-application.dto';
import { ApproveApplicationDto } from './dto/approve-application.dto';
import { RejectApplicationDto } from './dto/reject-application.dto';
import { FinalDecisionDto, FinalDecision } from './dto/final-decision.dto';
import { MailService } from '../mail/mail.service';
import { Role } from '../auth/enum/role.enum';

@Injectable()
export class ApplicationService {
  constructor(
    @InjectModel(Application.name) private applicationModel: Model<Application>,
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(ClubMember.name) private clubMemberModel: Model<ClubMember>,
    private mailService: MailService,
  ) {}

  // Student apply to club
  async createApplication(userId: string, createDto: CreateApplicationDto) {
    const { clubId, reason } = createDto;

    // Validate user
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('Không tìm thấy người dùng');
    }

    if (user.role !== Role.USER) {
      throw new ForbiddenException(
        'Chỉ sinh viên mới có thể đăng ký vào câu lạc bộ',
      );
    }

    // Validate club
    const club = await this.userModel.findById(clubId);
    if (!club) {
      throw new NotFoundException('Không tìm thấy câu lạc bộ');
    }

    if (club.role !== Role.CLUB) {
      throw new BadRequestException('ID không phải là câu lạc bộ');
    }

    // Check if already applied
    const existingApplication = await this.applicationModel.findOne({
      clubId: new Types.ObjectId(clubId),
      userId: new Types.ObjectId(userId),
      status: { $in: [ApplicationStatus.PENDING, ApplicationStatus.APPROVED] },
    });

    if (existingApplication) {
      throw new BadRequestException(
        'Bạn đã gửi đơn đăng ký vào câu lạc bộ này rồi',
      );
    }

    // Check if already a member
    const clubMembers = await this.clubMemberModel.findOne({
      clubId: new Types.ObjectId(clubId),
    });

    if (clubMembers) {
      const isMember = clubMembers.users.some(
        (member) =>
          member.userId.toString() === userId && member.isActive === true,
      );
      if (isMember) {
        throw new BadRequestException(
          'Bạn đã là thành viên của câu lạc bộ này',
        );
      }
    }

    // Create application
    const application = await this.applicationModel.create({
      clubId: new Types.ObjectId(clubId),
      userId: new Types.ObjectId(userId),
      reason,
      status: ApplicationStatus.PENDING,
      submittedAt: new Date(),
    });

    // Send email notification
    await this.mailService.sendApplicationSubmittedEmail(
      user.email,
      user.fullName,
      club.fullName,
    );

    return {
      message: 'Đơn đăng ký đã được gửi thành công',
      application,
    };
  }
  // Club view applications
  async getClubApplications(clubId: string, status?: ApplicationStatus) {
    // Validate club
    const club = await this.userModel.findById(clubId);
    if (!club || club.role !== Role.CLUB) {
      throw new ForbiddenException('Chỉ câu lạc bộ mới có thể xem đơn đăng ký');
    }
    const filter: any = { clubId: new Types.ObjectId(clubId) };
    if (status) {
      filter.status = status;
    }

    const applications = await this.applicationModel
      .find(filter)
      .populate('userId', '-password')
      .sort({ submittedAt: -1 })
      .exec();

    return {
      total: applications.length,
      applications,
    };
  }
  // Student view their applications
  async getMyApplications(userId: string, status?: ApplicationStatus) {
    const filter: any = { userId: new Types.ObjectId(userId) };
    if (status) {
      filter.status = status;
    }
    const applications = await this.applicationModel
      .find(filter)
      .populate('clubId', 'fullName category description avatarUrl rating')
      .sort({ submittedAt: -1 })
      .exec();

    return {
      total: applications.length,
      applications,
    };
  }
  // Club approve application and send interview schedule
  async approveApplication(
    clubId: string,
    applicationId: string,
    approveDto: ApproveApplicationDto,
  ) {
    const application = await this.applicationModel
      .findById(applicationId)
      .populate('userId')
      .populate('clubId')
      .exec();
    if (!application) {
      throw new NotFoundException('Không tìm thấy đơn đăng ký');
    }

    if (application.clubId._id.toString() !== clubId) {
      throw new ForbiddenException('Bạn không có quyền duyệt đơn này');
    }

    if (application.status !== ApplicationStatus.PENDING) {
      throw new BadRequestException('Đơn đăng ký này đã được xử lý');
    }

    // Update application
    application.status = ApplicationStatus.APPROVED;
    application.interviewDate = new Date(approveDto.interviewDate);
    application.interviewLocation = approveDto.interviewLocation;
    application.interviewNote = approveDto.interviewNote;
    application.respondedAt = new Date();
    await application.save();

    // Send interview schedule email
    const user = application.userId as any;
    const club = application.clubId as any;

    await this.mailService.sendInterviewScheduleEmail(
      user.email,
      user.fullName,
      club.fullName,
      application.interviewDate,
      application.interviewLocation,
      application.interviewNote,
    );

    return {
      message: 'Đã duyệt đơn và gửi lịch phỏng vấn thành công',
      application,
    };
  }
  // Club reject application
  async rejectApplication(
    clubId: string,
    applicationId: string,
    rejectDto: RejectApplicationDto,
  ) {
    const application = await this.applicationModel
      .findById(applicationId)
      .populate('userId')
      .populate('clubId')
      .exec();
    if (!application) {
      throw new NotFoundException('Không tìm thấy đơn đăng ký');
    }

    if (application.clubId._id.toString() !== clubId) {
      throw new ForbiddenException('Bạn không có quyền từ chối đơn này');
    }

    if (application.status !== ApplicationStatus.PENDING) {
      throw new BadRequestException('Đơn đăng ký này đã được xử lý');
    }

    // Update application
    application.status = ApplicationStatus.REJECTED;
    application.rejectionReason = rejectDto.rejectionReason;
    application.respondedAt = new Date();
    await application.save();

    // Send rejection email
    const user = application.userId as any;
    const club = application.clubId as any;

    await this.mailService.sendApplicationRejectedEmail(
      user.email,
      user.fullName,
      club.fullName,
      application.rejectionReason,
    );

    return {
      message: 'Đã từ chối đơn đăng ký',
      application,
    };
  }
  // Club make final decision after interview
  async makeFinalDecision(
    clubId: string,
    applicationId: string,
    decisionDto: FinalDecisionDto,
  ) {
    const application = await this.applicationModel
      .findById(applicationId)
      .populate('userId')
      .populate('clubId')
      .exec();
    if (!application) {
      throw new NotFoundException('Không tìm thấy đơn đăng ký');
    }

    if (application.clubId._id.toString() !== clubId) {
      throw new ForbiddenException('Bạn không có quyền quyết định đơn này');
    }

    if (application.status !== ApplicationStatus.APPROVED) {
      throw new BadRequestException(
        'Đơn đăng ký chưa được duyệt hoặc đã được xử lý',
      );
    }

    const user = application.userId as any;
    const club = application.clubId as any;

    if (decisionDto.decision === FinalDecision.ACCEPTED) {
      // Update application status
      application.status = ApplicationStatus.ACCEPTED;
      await application.save();

      // Add user to club_mems
      await this.addUserToClubMembers(clubId, user);

      // Update user's clubJoined array
      await this.updateUserClubJoined(user._id.toString(), clubId);

      // Send acceptance email
      await this.mailService.sendFinalDecisionEmail(
        user.email,
        user.fullName,
        club.fullName,
        true,
      );

      return {
        message: 'Đã chấp nhận thành viên mới',
        application,
      };
    } else {
      // DECLINED
      application.status = ApplicationStatus.DECLINED;
      application.rejectionReason = decisionDto.rejectionReason;
      await application.save();

      // Send declined email
      await this.mailService.sendFinalDecisionEmail(
        user.email,
        user.fullName,
        club.fullName,
        false,
        application.rejectionReason,
      );

      return {
        message: 'Đã từ chối ứng viên',
        application,
      };
    }
  }
  // Helper: Add user to club_mems
  private async addUserToClubMembers(clubId: string, user: any) {
    let clubMembers = await this.clubMemberModel.findOne({
      clubId: new Types.ObjectId(clubId),
    });
    const memberData = {
      userId: user._id,
      email: user.email,
      fullName: user.fullName,
      phoneNumber: user.phoneNumber,
      avatarUrl: user.avatarUrl,
      school: user.school,
      major: user.major,
      year: user.year,
      skills: user.skills,
      interests: user.interests,
      joinedAt: new Date(),
      isActive: true,
    };

    if (!clubMembers) {
      // Create new club_mems document
      clubMembers = await this.clubMemberModel.create({
        clubId: new Types.ObjectId(clubId),
        users: [memberData],
        quantity: 1,
      });
    } else {
      // Add to existing
      clubMembers.users.push(memberData);
      clubMembers.quantity = clubMembers.users.length;
      await clubMembers.save();
    }
  }
  // Helper: Update user's clubJoined array
  private async updateUserClubJoined(userId: string, clubId: string) {
    const user = await this.userModel.findById(userId);
    if (!user) return;
    if (!user.clubJoined) {
      user.clubJoined = [];
    }

    user.clubJoined.push({
      clubId: new Types.ObjectId(clubId),
      joinedAt: new Date(),
      isActive: true,
    });

    await user.save();
  }
  // Get application details
  async getApplicationById(
    applicationId: string,
    userId: string,
    userRole: Role,
  ) {
    const application = await this.applicationModel
      .findById(applicationId)
      .populate('userId', '-password')
      .populate('clubId', '-password')
      .exec();
    if (!application) {
      throw new NotFoundException('Không tìm thấy đơn đăng ký');
    }

    // Check permission
    const isStudent = application.userId._id.toString() === userId;
    const isClub = application.clubId._id.toString() === userId;
    const isAdmin = userRole === Role.ADMIN;

    if (!isStudent && !isClub && !isAdmin) {
      throw new ForbiddenException('Bạn không có quyền xem đơn đăng ký này');
    }

    return application;
  }
  // Cancel application (Student only, before approved)
  async cancelApplication(applicationId: string, userId: string) {
    const application = await this.applicationModel.findById(applicationId);
    if (!application) {
      throw new NotFoundException('Không tìm thấy đơn đăng ký');
    }

    if (application.userId.toString() !== userId) {
      throw new ForbiddenException('Bạn không có quyền hủy đơn này');
    }

    if (application.status !== ApplicationStatus.PENDING) {
      throw new BadRequestException('Không thể hủy đơn đã được xử lý');
    }

    await this.applicationModel.deleteOne({ _id: applicationId });

    return {
      message: 'Đã hủy đơn đăng ký thành công',
    };
  }
}
