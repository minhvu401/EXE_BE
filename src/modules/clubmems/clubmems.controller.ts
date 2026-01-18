// club-member.controller.ts
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { ClubMemberService } from './clubmems.service';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/role.decorator';
import { CurrentUser } from '../auth/decorators/currentUser.decorator';
import { Role } from '../auth/enum/role.enum';
import type { UserPayload } from '../auth/interface/user-payload.interface';
import { RemoveMemberDto } from './dto/remove-member.dto';
import { UpdateMemberRoleDto } from './dto/update-member-role.dto';
import { GetMembersQueryDto } from './dto/get-members.dto';

@ApiTags('Club Members')
@Controller('club-members')
export class ClubMemberController {
  constructor(private readonly clubMemberService: ClubMemberService) {}

  @Get('club/:clubId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Roles(Role.CLUB)
  @ApiOperation({
    summary: 'Xem danh sách thành viên của club (club account/club resident)',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['active', 'inactive', 'all'],
  })
  @ApiQuery({ name: 'role', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    enum: ['newest', 'oldest', 'name'],
  })
  @ApiResponse({ status: 200, description: 'Lấy danh sách thành công' })
  async getClubMembers(
    @Param('clubId') clubId: string,
    @Query() query: GetMembersQueryDto,
  ) {
    return this.clubMemberService.getClubMembers(clubId, query);
  }
  @Get('club/:clubId/member/:memberId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Roles(Role.CLUB)
  @ApiOperation({
    summary: 'Xem chi tiết thành viên (club account/club resident)',
  })
  @ApiResponse({ status: 200, description: 'Lấy thông tin thành công' })
  async getMemberDetails(
    @Param('clubId') clubId: string,
    @Param('memberId') memberId: string,
  ) {
    return this.clubMemberService.getMemberDetails(clubId, memberId);
  }
  @Delete('club/:clubId/remove')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Roles(Role.CLUB)
  @ApiOperation({ summary: 'Xóa thành viên khỏi club (club account only)' })
  @ApiResponse({ status: 200, description: 'Xóa thành viên thành công' })
  async removeMember(
    @CurrentUser() user: UserPayload,
    @Param('clubId') clubId: string,
    @Body() removeDto: RemoveMemberDto,
  ) {
    // Validate that the user is the club account
    if (user.sub !== clubId) {
      throw new ForbiddenException('Chỉ chủ club mới có thể xóa thành viên');
    }
    return this.clubMemberService.removeMember(clubId, removeDto, user.sub);
  }
  @Put('club/:clubId/update-role')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Roles(Role.CLUB)
  @ApiOperation({ summary: 'Cập nhật vai trò thành viên (club account only)' })
  @ApiResponse({ status: 200, description: 'Cập nhật vai trò thành công' })
  async updateMemberRole(
    @CurrentUser() user: UserPayload,
    @Param('clubId') clubId: string,
    @Body() updateDto: UpdateMemberRoleDto,
  ) {
    // Validate that the user is the club account
    if (user.sub !== clubId) {
      throw new ForbiddenException('Chỉ chủ club mới có thể cập nhật vai trò');
    }
    return this.clubMemberService.updateMemberRole(clubId, updateDto, user.sub);
  }
  @Get('club/:clubId/statistics')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Roles(Role.CLUB)
  @ApiOperation({
    summary: 'Xem thống kê thành viên (club account/club resident)',
  })
  @ApiResponse({ status: 200, description: 'Lấy thống kê thành công' })
  async getMemberStatistics(@Param('clubId') clubId: string) {
    return this.clubMemberService.getMemberStatistics(clubId);
  }
  @Get('club/:clubId/export')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Roles(Role.CLUB)
  @ApiOperation({ summary: 'Export danh sách thành viên (club account only)' })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['active', 'inactive', 'all'],
  })
  @ApiResponse({ status: 200, description: 'Export thành công' })
  async exportMembersList(
    @CurrentUser() user: UserPayload,
    @Param('clubId') clubId: string,
    @Query('status') status: 'active' | 'inactive' | 'all' = 'all',
  ) {
    // Validate that the user is the club account
    if (user.sub !== clubId) {
      throw new ForbiddenException('Chỉ chủ club mới có thể export danh sách');
    }
    return this.clubMemberService.exportMembersList(clubId, status);
  }
  @Get('my-clubs')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Roles(Role.USER)
  @ApiOperation({ summary: 'Xem danh sách clubs đã tham gia (Student only)' })
  @ApiQuery({ name: 'status', required: false, enum: ['active', 'all'] })
  @ApiResponse({ status: 200, description: 'Lấy danh sách thành công' })
  @ApiResponse({
    status: 403,
    description:
      'Chỉ có sinh viên mới được xem danh sách câu lạc bộ đã tham gia',
  })
  async getUserClubs(
    @CurrentUser() user: UserPayload,
    @Query('status') status: 'active' | 'all' = 'active',
  ) {
    return this.clubMemberService.getUserClubs(user.sub, status);
  }

  @Get('club/:clubId/pending-actions')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Roles(Role.USER)
  @ApiOperation({
    summary: 'Xem danh sách yêu cầu chờ xác nhận (club account/club resident)',
  })
  @ApiResponse({ status: 200, description: 'Lấy danh sách thành công' })
  async getPendingActions(
    @CurrentUser() user: UserPayload,
    @Param('clubId') clubId: string,
  ) {
    return this.clubMemberService.getPendingActions(clubId, user.sub);
  }

  @Post('pending-actions/:id/approve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Roles(Role.USER)
  @ApiOperation({ summary: 'Xác nhận yêu cầu hành động (club resident only)' })
  @ApiResponse({ status: 200, description: 'Yêu cầu đã được xác nhận' })
  @ApiResponse({ status: 404, description: 'Yêu cầu không tồn tại' })
  @ApiResponse({ status: 403, description: 'Không có quyền xác nhận' })
  async approvePendingActionAdmin(
    @CurrentUser() user: UserPayload,
    @Param('id') pendingActionId: string,
  ): Promise<any> {
    return this.clubMemberService.approvePendingActionById(
      pendingActionId,
      user.sub,
    );
  }

  @Post('pending-actions/:id/reject')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Roles(Role.USER)
  @ApiOperation({ summary: 'Từ chối yêu cầu hành động (club resident only)' })
  @ApiResponse({ status: 200, description: 'Yêu cầu đã bị từ chối' })
  @ApiResponse({ status: 404, description: 'Yêu cầu không tồn tại' })
  @ApiResponse({ status: 403, description: 'Không có quyền từ chối' })
  async rejectPendingAction(
    @CurrentUser() user: UserPayload,
    @Param('id') pendingActionId: string,
    @Body() body?: { reason?: string },
  ): Promise<any> {
    return this.clubMemberService.rejectPendingActionById(
      pendingActionId,
      user.sub,
      body?.reason,
    );
  }
}
