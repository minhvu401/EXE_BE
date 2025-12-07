import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { ApplicationService } from './application.service';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/role.decorator';
import { CurrentUser } from '../auth/decorators/currentUser.decorator';
import { Role } from '../auth/enum/role.enum';
import type { UserPayload } from '../auth/interface/user-payload.interface';
import { CreateApplicationDto } from './dto/create-application.dto';
import { ApproveApplicationDto } from './dto/approve-application.dto';
import { RejectApplicationDto } from './dto/reject-application.dto';
import { FinalDecisionDto } from './dto/final-decision.dto';
import { ApplicationStatus } from './enum/application.enum';

@ApiTags('Applications')
@Controller('applications')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ApplicationController {
  constructor(private readonly applicationService: ApplicationService) {}

  @Post()
  @Roles(Role.USER)
  @ApiOperation({ summary: 'Sinh viên đăng ký vào câu lạc bộ (for mem)' })
  @ApiResponse({ status: 201, description: 'Đăng ký thành công' })
  @ApiResponse({ status: 400, description: 'Đã đăng ký hoặc đã là thành viên' })
  async createApplication(
    @CurrentUser() user: UserPayload,
    @Body() createDto: CreateApplicationDto,
  ) {
    return this.applicationService.createApplication(user.sub, createDto);
  }

  @Get('my-applications')
  @Roles(Role.USER)
  @ApiOperation({ summary: 'Xem danh sách đơn đăng ký của tôi (for mem)' })
  @ApiQuery({ name: 'status', required: false, enum: ApplicationStatus })
  @ApiResponse({ status: 200, description: 'Lấy danh sách thành công' })
  async getMyApplications(
    @CurrentUser() user: UserPayload,
    @Query('status') status?: ApplicationStatus,
  ) {
    return this.applicationService.getMyApplications(user.sub, status);
  }

  @Get('club/:clubId')
  @Roles(Role.CLUB, Role.ADMIN)
  @ApiOperation({ summary: 'Câu lạc bộ xem danh sách đơn đăng ký' })
  @ApiQuery({ name: 'status', required: false, enum: ApplicationStatus })
  @ApiResponse({ status: 200, description: 'Lấy danh sách thành công' })
  async getClubApplications(
    @Param('clubId') clubId: string,
    @Query('status') status?: ApplicationStatus,
  ) {
    return this.applicationService.getClubApplications(clubId, status);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Xem chi tiết đơn đăng ký' })
  @ApiResponse({ status: 200, description: 'Lấy thông tin thành công' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy đơn đăng ký' })
  async getApplicationById(
    @Param('id') id: string,
    @CurrentUser() user: UserPayload,
  ) {
    return this.applicationService.getApplicationById(id, user.sub, user.role);
  }

  @Patch(':id/approve')
  @Roles(Role.CLUB)
  @ApiOperation({ summary: 'Duyệt đơn và gửi lịch phỏng vấn' })
  @ApiResponse({ status: 200, description: 'Duyệt đơn thành công' })
  @ApiResponse({ status: 400, description: 'Đơn đã được xử lý' })
  async approveApplication(
    @CurrentUser() user: UserPayload,
    @Param('id') id: string,
    @Body() approveDto: ApproveApplicationDto,
  ) {
    return this.applicationService.approveApplication(user.sub, id, approveDto);
  }

  @Patch(':id/reject')
  @Roles(Role.CLUB)
  @ApiOperation({ summary: 'Từ chối đơn đăng ký' })
  @ApiResponse({ status: 200, description: 'Từ chối đơn thành công' })
  @ApiResponse({ status: 400, description: 'Đơn đã được xử lý' })
  async rejectApplication(
    @CurrentUser() user: UserPayload,
    @Param('id') id: string,
    @Body() rejectDto: RejectApplicationDto,
  ) {
    return this.applicationService.rejectApplication(user.sub, id, rejectDto);
  }

  @Patch(':id/final-decision')
  @Roles(Role.CLUB)
  @ApiOperation({ summary: 'Quyết định cuối cùng sau phỏng vấn' })
  @ApiResponse({
    status: 200,
    description:
      'Quyết định thành công, thêm vào danh sách câu lạc bộ nếu accepted',
  })
  @ApiResponse({ status: 400, description: 'Đơn chưa được duyệt' })
  async makeFinalDecision(
    @CurrentUser() user: UserPayload,
    @Param('id') id: string,
    @Body() decisionDto: FinalDecisionDto,
  ) {
    return this.applicationService.makeFinalDecision(user.sub, id, decisionDto);
  }

  @Delete(':id/cancel')
  @Roles(Role.USER)
  @ApiOperation({ summary: 'Hủy đơn đăng ký (chỉ khi chưa duyệt)' })
  @ApiResponse({ status: 200, description: 'Hủy đơn thành công' })
  @ApiResponse({ status: 400, description: 'Không thể hủy đơn đã được xử lý' })
  async cancelApplication(
    @CurrentUser() user: UserPayload,
    @Param('id') id: string,
  ) {
    return this.applicationService.cancelApplication(id, user.sub);
  }
}
