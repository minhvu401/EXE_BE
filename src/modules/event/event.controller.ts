// event.controller.ts
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
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { EventService } from './event.service';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/role.decorator';
import { CurrentUser } from '../auth/decorators/currentUser.decorator';
import { Role } from '../auth/enum/role.enum';
import type { UserPayload } from '../auth/interface/user-payload.interface';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { CancelRegistrationDto } from './dto/cancel-registration.dto';

@ApiTags('Events')
@Controller('events')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class EventController {
  constructor(private readonly eventService: EventService) {}

  @Post()
  @Roles(Role.CLUB)
  @ApiOperation({ summary: 'Tạo sự kiện mới (Club only)' })
  @ApiResponse({ status: 201, description: 'Tạo sự kiện thành công' })
  @ApiResponse({ status: 403, description: 'Chỉ câu lạc bộ mới có thể tạo' })
  async createEvent(
    @CurrentUser() user: UserPayload,
    @Body() createDto: CreateEventDto,
  ) {
    return this.eventService.createEvent(user.sub, createDto);
  }

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách sự kiện' })
  @ApiQuery({
    name: 'filter',
    required: false,
    enum: ['all', 'upcoming', 'past', 'ongoing'],
    description: 'Lọc sự kiện',
  })
  @ApiQuery({
    name: 'clubId',
    required: false,
    description: 'Lọc theo câu lạc bộ',
  })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'skip', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Lấy danh sách thành công' })
  async getAllEvents(
    @CurrentUser() user: UserPayload,
    @Query('filter') filter: 'all' | 'upcoming' | 'past' | 'ongoing' = 'all',
    @Query('clubId') clubId?: string,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number = 20,
    @Query('skip', new DefaultValuePipe(0), ParseIntPipe) skip: number = 0,
  ) {
    return this.eventService.getEventsWithRegistrationStatus(
      user.sub,
      filter,
      clubId,
      limit,
      skip,
    );
  }

  @Get('my-events')
  @Roles(Role.USER)
  @ApiOperation({ summary: 'Xem danh sách sự kiện đã đăng ký (Student only)' })
  @ApiQuery({
    name: 'filter',
    required: false,
    enum: ['all', 'upcoming', 'past'],
  })
  @ApiResponse({ status: 200, description: 'Lấy danh sách thành công' })
  async getMyRegisteredEvents(
    @CurrentUser() user: UserPayload,
    @Query('filter') filter: 'all' | 'upcoming' | 'past' = 'all',
  ) {
    return this.eventService.getMyRegisteredEvents(user.sub, filter);
  }

  @Get('deleted')
  @Roles(Role.CLUB)
  @ApiOperation({ summary: 'Xem danh sách sự kiện đã xóa (Club only)' })
  @ApiResponse({ status: 200, description: 'Lấy danh sách thành công' })
  async getDeletedEvents(@CurrentUser() user: UserPayload) {
    return this.eventService.getDeletedEvents(user.sub);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Xem chi tiết sự kiện' })
  @ApiResponse({ status: 200, description: 'Lấy thông tin thành công' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy sự kiện' })
  async getEventById(@Param('id') id: string) {
    return this.eventService.getEventById(id);
  }

  @Get(':id/participants')
  @Roles(Role.CLUB)
  @ApiOperation({ summary: 'Xem danh sách người tham gia (Club owner only)' })
  @ApiResponse({ status: 200, description: 'Lấy danh sách thành công' })
  async getEventParticipants(
    @CurrentUser() user: UserPayload,
    @Param('id') id: string,
  ) {
    return this.eventService.getEventParticipants(user.sub, id);
  }

  @Patch(':id')
  @Roles(Role.CLUB)
  @ApiOperation({ summary: 'Cập nhật sự kiện (Club owner only)' })
  @ApiResponse({ status: 200, description: 'Cập nhật thành công' })
  async updateEvent(
    @CurrentUser() user: UserPayload,
    @Param('id') id: string,
    @Body() updateDto: UpdateEventDto,
  ) {
    return this.eventService.updateEvent(user.sub, id, updateDto);
  }

  @Delete(':id/soft')
  @Roles(Role.CLUB)
  @ApiOperation({ summary: 'Xóa sự kiện (Soft delete - Club owner only)' })
  @ApiResponse({ status: 200, description: 'Xóa thành công' })
  async softDeleteEvent(
    @CurrentUser() user: UserPayload,
    @Param('id') id: string,
  ) {
    return this.eventService.softDeleteEvent(user.sub, id);
  }

  @Delete(':id/hard')
  @Roles(Role.CLUB)
  @ApiOperation({
    summary: 'Xóa vĩnh viễn sự kiện (Hard delete - Club owner only)',
  })
  @ApiResponse({ status: 200, description: 'Xóa vĩnh viễn thành công' })
  async hardDeleteEvent(
    @CurrentUser() user: UserPayload,
    @Param('id') id: string,
  ) {
    return this.eventService.hardDeleteEvent(user.sub, id);
  }

  @Patch(':id/restore')
  @Roles(Role.CLUB)
  @ApiOperation({ summary: 'Khôi phục sự kiện đã xóa (Club owner only)' })
  @ApiResponse({ status: 200, description: 'Khôi phục thành công' })
  async restoreEvent(
    @CurrentUser() user: UserPayload,
    @Param('id') id: string,
  ) {
    return this.eventService.restoreEvent(user.sub, id);
  }

  @Post(':id/register')
  @Roles(Role.USER)
  @ApiOperation({ summary: 'Đăng ký tham gia sự kiện (Student only)' })
  @ApiResponse({ status: 201, description: 'Đăng ký thành công' })
  @ApiResponse({
    status: 400,
    description: 'Đã đăng ký hoặc sự kiện đã đủ người',
  })
  async registerForEvent(
    @CurrentUser() user: UserPayload,
    @Param('id') id: string,
  ) {
    return this.eventService.registerForEvent(user.sub, id);
  }

  @Post(':id/cancel')
  @Roles(Role.USER)
  @ApiOperation({ summary: 'Hủy đăng ký sự kiện (Student only)' })
  @ApiResponse({ status: 200, description: 'Hủy đăng ký thành công' })
  async cancelRegistration(
    @CurrentUser() user: UserPayload,
    @Param('id') id: string,
    @Body() cancelDto: CancelRegistrationDto,
  ) {
    return this.eventService.cancelRegistration(user.sub, id, cancelDto);
  }

  @Post(':id/check-in/:userId')
  @Roles(Role.CLUB)
  @ApiOperation({ summary: 'Check-in người tham gia (Club owner only)' })
  @ApiResponse({ status: 200, description: 'Check-in thành công' })
  async checkInParticipant(
    @CurrentUser() user: UserPayload,
    @Param('id') id: string,
    @Param('userId') userId: string,
  ) {
    return this.eventService.checkInParticipant(user.sub, id, userId);
  }

  @Delete(':id/check-in/:userId/undo')
  @Roles(Role.CLUB)
  @ApiOperation({ summary: 'Hủy check-in (Club owner only)' })
  @ApiResponse({ status: 200, description: 'Hủy check-in thành công' })
  async undoCheckIn(
    @CurrentUser() user: UserPayload,
    @Param('id') id: string,
    @Param('userId') userId: string,
  ) {
    return this.eventService.undoCheckIn(user.sub, id, userId);
  }
}
