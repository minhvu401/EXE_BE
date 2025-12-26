/* eslint-disable @typescript-eslint/no-unsafe-call */
// event.service.ts
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Cron } from '@nestjs/schedule';
import { Event } from './schema/event.schema';
import { EventStatus } from './enum/event.enum';
import { User } from '../auth/schemas/user.schema';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { CancelRegistrationDto } from './dto/cancel-event.dto';
import { MailService } from '../mail/mail.service';
import { Role } from '../auth/enum/role.enum';

@Injectable()
export class EventService {
  private readonly logger = new Logger(EventService.name);

  constructor(
    @InjectModel(Event.name) private eventModel: Model<Event>,
    @InjectModel(User.name) private userModel: Model<User>,
    private mailService: MailService,
  ) {}

  // Create event (Club only)
  async createEvent(clubId: string, createDto: CreateEventDto) {
    // Validate club
    const club = await this.userModel.findById(clubId);
    if (!club || club.role !== Role.CLUB) {
      throw new ForbiddenException('Chỉ câu lạc bộ mới có thể tạo sự kiện');
    }

    // Validate event time (must be in the future)
    const eventTime = new Date(createDto.time);
    if (eventTime <= new Date()) {
      throw new BadRequestException('Thời gian sự kiện phải ở tương lai');
    }

    // Create event
    const event = await this.eventModel.create({
      clubId: new Types.ObjectId(clubId),
      title: createDto.title,
      description: createDto.description,
      location: createDto.location,
      time: eventTime,
      maxParticipants: createDto.maxParticipants,
      images: createDto.images || [],
      joinedUsers: [],
      cancelledUsers: [],
      status: EventStatus.UPCOMING,
      isActive: true,
      reminderSent: false,
    });

    return {
      message: 'Tạo sự kiện thành công',
      event,
    };
  }

  // Get all events with filters
  async getAllEvents(
    filter: 'all' | 'upcoming' | 'past' | 'ongoing' = 'all',
    clubId?: string,
    limit: number = 20,
    skip: number = 0,
  ) {
    const query: Record<string, any> = { isActive: true };

    if (clubId) {
      query.clubId = new Types.ObjectId(clubId);
    }

    // Filter by status
    const now = new Date();
    switch (filter) {
      case 'upcoming':
        query.time = { $gt: now };
        query.status = EventStatus.UPCOMING;
        break;
      case 'past':
        query.time = { $lt: now };
        query.status = { $in: [EventStatus.COMPLETED, EventStatus.CANCELLED] };
        break;
      case 'ongoing':
        query.status = EventStatus.ONGOING;
        break;
    }

    const events = await this.eventModel
      .find(query)
      .populate('clubId', 'fullName avatarUrl category rating')
      .sort({ time: filter === 'past' ? -1 : 1 })
      .limit(limit)
      .skip(skip)
      .exec();

    const total = await this.eventModel.countDocuments(query);

    // Add available slots info
    const eventsWithSlots = events.map((event: Event) => {
      const eventObj = event.toObject() as Record<string, any>;
      return {
        ...eventObj,
        availableSlots: event.maxParticipants - event.joinedUsers.length,
        isFull: event.joinedUsers.length >= event.maxParticipants,
      };
    });

    return {
      total,
      events: eventsWithSlots,
      hasMore: skip + events.length < total,
    };
  }

  // Get event by ID
  async getEventById(eventId: string) {
    const event = await this.eventModel
      .findOne({ _id: eventId, isActive: true })
      .populate(
        'clubId',
        'fullName avatarUrl category rating email phoneNumber',
      )
      .exec();

    if (!event) {
      throw new NotFoundException('Không tìm thấy sự kiện');
    }

    return {
      ...event.toObject(),
      availableSlots: event.maxParticipants - event.joinedUsers.length,
      isFull: event.joinedUsers.length >= event.maxParticipants,
    };
  }

  // Update event (Club owner only)
  async updateEvent(
    clubId: string,
    eventId: string,
    updateDto: UpdateEventDto,
  ) {
    const event = await this.eventModel.findById(eventId);

    if (!event) {
      throw new NotFoundException('Không tìm thấy sự kiện');
    }

    if (event.clubId.toString() !== clubId) {
      throw new ForbiddenException('Bạn không có quyền chỉnh sửa sự kiện này');
    }

    if (!event.isActive) {
      throw new BadRequestException('Không thể chỉnh sửa sự kiện đã xóa');
    }

    // If updating time, validate it's in the future
    if (updateDto.time) {
      const newTime = new Date(updateDto.time);
      if (newTime <= new Date()) {
        throw new BadRequestException('Thời gian sự kiện phải ở tương lai');
      }
      event.time = newTime;
      event.reminderSent = false; // Reset reminder flag if time changed
    }

    // Update fields
    if (updateDto.title) event.title = updateDto.title;
    if (updateDto.description) event.description = updateDto.description;
    if (updateDto.location) event.location = updateDto.location;
    if (updateDto.maxParticipants) {
      // Cannot reduce below current participants
      if (updateDto.maxParticipants < event.joinedUsers.length) {
        throw new BadRequestException(
          `Không thể giảm số lượng xuống dưới ${event.joinedUsers.length} (số người đã đăng ký)`,
        );
      }
      event.maxParticipants = updateDto.maxParticipants;
    }
    if (updateDto.images !== undefined) event.images = updateDto.images;

    await event.save();

    return {
      message: 'Cập nhật sự kiện thành công',
      event,
    };
  }

  // Soft delete event (Club owner only)
  async softDeleteEvent(clubId: string, eventId: string) {
    const event = await this.eventModel.findById(eventId);

    if (!event) {
      throw new NotFoundException('Không tìm thấy sự kiện');
    }

    if (event.clubId.toString() !== clubId) {
      throw new ForbiddenException('Bạn không có quyền xóa sự kiện này');
    }

    event.isActive = false;
    event.deletedAt = new Date();
    event.status = EventStatus.CANCELLED;
    await event.save();

    return {
      message: 'Xóa sự kiện thành công (soft delete)',
    };
  }

  // Hard delete event (Club owner only)
  async hardDeleteEvent(clubId: string, eventId: string) {
    const event = await this.eventModel.findById(eventId);

    if (!event) {
      throw new NotFoundException('Không tìm thấy sự kiện');
    }

    if (event.clubId.toString() !== clubId) {
      throw new ForbiddenException('Bạn không có quyền xóa sự kiện này');
    }

    await this.eventModel.deleteOne({ _id: eventId });

    return {
      message: 'Xóa sự kiện vĩnh viễn thành công (hard delete)',
    };
  }

  // Restore soft deleted event (Club owner only)
  async restoreEvent(clubId: string, eventId: string) {
    const event = await this.eventModel.findById(eventId);

    if (!event) {
      throw new NotFoundException('Không tìm thấy sự kiện');
    }

    if (event.clubId.toString() !== clubId) {
      throw new ForbiddenException('Bạn không có quyền khôi phục sự kiện này');
    }

    event.isActive = true;
    event.deletedAt = undefined;
    event.status = EventStatus.UPCOMING;
    await event.save();

    return {
      message: 'Khôi phục sự kiện thành công',
      event,
    };
  }

  // Get deleted events (Club owner only)
  async getDeletedEvents(clubId: string) {
    const club = await this.userModel.findById(clubId);
    if (!club || club.role !== Role.CLUB) {
      throw new ForbiddenException(
        'Chỉ câu lạc bộ mới có thể xem sự kiện đã xóa',
      );
    }

    const events = await this.eventModel
      .find({ clubId: new Types.ObjectId(clubId), isActive: false })
      .sort({ deletedAt: -1 })
      .exec();

    return {
      total: events.length,
      events,
    };
  }

  // Student register for event
  async registerForEvent(userId: string, eventId: string) {
    const event = await this.eventModel.findOne({
      _id: eventId,
      isActive: true,
    });

    if (!event) {
      throw new NotFoundException('Không tìm thấy sự kiện');
    }

    // Validate user
    const user = await this.userModel.findById(userId);
    if (!user || user.role !== Role.USER) {
      throw new ForbiddenException('Chỉ sinh viên mới có thể đăng ký sự kiện');
    }

    // Check if event is in the future
    if (event.time <= new Date()) {
      throw new BadRequestException('Không thể đăng ký sự kiện đã diễn ra');
    }

    // Check if event is full
    if (event.joinedUsers.length >= event.maxParticipants) {
      throw new BadRequestException('Sự kiện đã đủ số lượng người tham gia');
    }

    // Check if already registered
    const alreadyRegistered = event.joinedUsers.some(
      (participant) => participant.userId.toString() === userId,
    );

    if (alreadyRegistered) {
      throw new BadRequestException('Bạn đã đăng ký sự kiện này rồi');
    }

    // Add user to joinedUsers
    event.joinedUsers.push({
      userId: new Types.ObjectId(userId),
      email: user.email,
      fullName: user.fullName,
      phoneNumber: user.phoneNumber,
      registeredAt: new Date(),
      checkedIn: false,
    });

    await event.save();

    // Send confirmation email
    await this.mailService.sendEventRegistrationEmail(
      user.email,
      user.fullName,
      event.title,
      event.time,
      event.location,
    );

    return {
      message: 'Đăng ký sự kiện thành công',
      event: {
        id: event._id,
        title: event.title,
        time: event.time,
        location: event.location,
        availableSlots: event.maxParticipants - event.joinedUsers.length,
      },
    };
  }

  // Student cancel registration
  // Student cancel registration
  async cancelRegistration(
    userId: string,
    eventId: string,
    cancelDto: CancelRegistrationDto,
  ) {
    const event = await this.eventModel
      .findOne({ _id: eventId, isActive: true })
      .populate('clubId')
      .exec();

    if (!event) {
      throw new NotFoundException('Không tìm thấy sự kiện');
    }

    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('Không tìm thấy người dùng');
    }

    // Find user in joinedUsers
    const userIndex = event.joinedUsers.findIndex(
      (participant) => participant.userId.toString() === userId,
    );

    if (userIndex === -1) {
      throw new BadRequestException('Bạn chưa đăng ký sự kiện này');
    }

    const participant = event.joinedUsers[userIndex];

    // Check if user has checked in - cannot cancel if already checked in
    if (participant.checkedIn) {
      throw new BadRequestException(
        'Bạn không thể hủy đăng ký vì đã check-in rồi',
      );
    }

    // Check if event is within 1 hour - cannot cancel if less than 1 hour to event
    const now = new Date();
    const oneHourBefore = new Date(event.time.getTime() - 60 * 60 * 1000);

    if (now >= oneHourBefore) {
      throw new BadRequestException(
        'Không thể hủy đăng ký trong vòng 1 giờ trước sự kiện',
      );
    }

    // Remove from joinedUsers
    const removedUser = event.joinedUsers.splice(userIndex, 1)[0];

    // Add to cancelledUsers with reason
    event.cancelledUsers.push({
      userId: new Types.ObjectId(userId),
      email: removedUser.email,
      fullName: removedUser.fullName,
      reason: cancelDto.reason,
      cancelledAt: new Date(),
    });

    await event.save();

    // Send notification to club
    const club = event.clubId as unknown as { email: string; fullName: string };
    await this.mailService.sendEventCancellationNotificationToClub(
      club.email,
      club.fullName,
      user.fullName,
      user.email,
      event.title,
      cancelDto.reason,
    );

    // Send confirmation to user
    await this.mailService.sendEventCancellationConfirmationToUser(
      user.email,
      user.fullName,
      event.title,
    );

    return {
      message: 'Đã hủy đăng ký sự kiện và thông báo cho câu lạc bộ',
    };
  }

  // Get my registered events (Student)
  async getMyRegisteredEvents(
    userId: string,
    filter: 'all' | 'upcoming' | 'past' = 'all',
  ) {
    const query: Record<string, any> = {
      'joinedUsers.userId': new Types.ObjectId(userId),
      isActive: true,
    };

    const now = new Date();
    if (filter === 'upcoming') {
      query.time = { $gt: now };
    } else if (filter === 'past') {
      query.time = { $lt: now };
    }

    const events = await this.eventModel
      .find(query)
      .populate('clubId', 'fullName avatarUrl category rating')
      .sort({ time: filter === 'past' ? -1 : 1 })
      .exec();

    // Add registration info for each event
    const eventsWithRegistrationInfo = events.map((event: Event) => {
      const userRegistration = event.joinedUsers.find(
        (participant) => participant.userId.toString() === userId,
      );

      const eventObj = event.toObject() as Record<string, any>;
      return {
        ...eventObj,
        myRegistration: userRegistration,
        availableSlots: event.maxParticipants - event.joinedUsers.length,
      };
    });

    return {
      total: events.length,
      events: eventsWithRegistrationInfo,
    };
  }

  // Get event participants (Club owner only)
  async getEventParticipants(clubId: string, eventId: string) {
    const event = await this.eventModel.findById(eventId);

    if (!event) {
      throw new NotFoundException('Không tìm thấy sự kiện');
    }

    if (event.clubId.toString() !== clubId) {
      throw new ForbiddenException('Bạn không có quyền xem danh sách này');
    }

    return {
      eventTitle: event.title,
      maxParticipants: event.maxParticipants,
      registered: event.joinedUsers.length,
      availableSlots: event.maxParticipants - event.joinedUsers.length,
      participants: event.joinedUsers,
      cancelledParticipants: event.cancelledUsers,
    };
  }

  // Check-in participant (Club owner only)
  async checkInParticipant(
    clubId: string,
    eventId: string,
    participantUserId: string,
  ) {
    const event = await this.eventModel.findById(eventId);

    if (!event) {
      throw new NotFoundException('Không tìm thấy sự kiện');
    }

    if (event.clubId.toString() !== clubId) {
      throw new ForbiddenException(
        'Bạn không có quyền check-in cho sự kiện này',
      );
    }

    // Find participant
    const participant = event.joinedUsers.find(
      (p) => p.userId.toString() === participantUserId,
    );

    if (!participant) {
      throw new NotFoundException(
        'Không tìm thấy người tham gia trong danh sách',
      );
    }

    if (participant.checkedIn) {
      throw new BadRequestException('Người này đã check-in rồi');
    }

    // Check-in
    participant.checkedIn = true;
    participant.checkedInAt = new Date();
    await event.save();

    return {
      message: `Check-in thành công cho ${participant.fullName}`,
      participant,
    };
  }

  // Undo check-in (Club owner only)
  async undoCheckIn(
    clubId: string,
    eventId: string,
    participantUserId: string,
  ) {
    const event = await this.eventModel.findById(eventId);

    if (!event) {
      throw new NotFoundException('Không tìm thấy sự kiện');
    }

    if (event.clubId.toString() !== clubId) {
      throw new ForbiddenException(
        'Bạn không có quyền thao tác với sự kiện này',
      );
    }

    // Find participant
    const participant = event.joinedUsers.find(
      (p) => p.userId.toString() === participantUserId,
    );

    if (!participant) {
      throw new NotFoundException(
        'Không tìm thấy người tham gia trong danh sách',
      );
    }

    if (!participant.checkedIn) {
      throw new BadRequestException('Người này chưa check-in');
    }

    // Undo check-in
    participant.checkedIn = false;
    participant.checkedInAt = undefined;
    await event.save();

    return {
      message: `Đã hủy check-in cho ${participant.fullName}`,
      participant,
    };
  }

  // Check if user registered for event
  async checkUserRegistration(
    userId: string,
    eventId: string,
  ): Promise<boolean> {
    const event = await this.eventModel.findById(eventId);
    if (!event) return false;

    return event.joinedUsers.some((p) => p.userId.toString() === userId);
  }

  // Get events with user registration status
  async getEventsWithRegistrationStatus(
    userId: string,
    filter: 'all' | 'upcoming' | 'past' | 'ongoing' = 'all',
    clubId?: string,
    limit: number = 20,
    skip: number = 0,
  ) {
    const result = await this.getAllEvents(filter, clubId, limit, skip);

    // Add isRegistered field for each event
    const eventsWithStatus = await Promise.all(
      result.events.map(async (event: Record<string, any>) => {
        const eventId = event._id ? String(event._id) : '';
        const isRegistered = await this.checkUserRegistration(userId, eventId);
        return {
          ...event,
          isRegistered,
        };
      }),
    );

    return {
      total: result.total,
      events: eventsWithStatus,
      hasMore: result.hasMore,
    };
  }

  // Scheduled job: Send reminders 24 hours before event
  @Cron('0 * * * *')
  async sendEventReminders() {
    this.logger.log('Running scheduled job: Send event reminders');

    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    // Find events happening in the next 24 hours that haven't sent reminders
    const upcomingEvents = await this.eventModel.find({
      time: { $gte: now, $lte: tomorrow },
      reminderSent: false,
      isActive: true,
      status: EventStatus.UPCOMING,
    });

    this.logger.log(`Found ${upcomingEvents.length} events to send reminders`);

    for (const event of upcomingEvents) {
      try {
        // Send reminder to all participants
        for (const participant of event.joinedUsers) {
          await this.mailService.sendEventReminderEmail(
            participant.email,
            participant.fullName,
            event.title,
            event.time,
            event.location,
          );
        }

        // Mark as reminded
        event.reminderSent = true;
        await event.save();

        this.logger.log(
          `Sent reminders for event: ${event.title} to ${event.joinedUsers.length} participants`,
        );
      } catch (error) {
        this.logger.error(
          `Failed to send reminders for event ${event._id.toString()}`,
          error instanceof Error ? error : new Error(String(error)),
        );
      }
    }
  }

  // Scheduled job: Update event statuses
  @Cron('*/10 * * * *')
  async updateEventStatuses() {
    this.logger.log('Running scheduled job: Update event statuses');

    const now = new Date();

    // Mark past events as completed
    const pastEvents = await this.eventModel.updateMany(
      {
        time: { $lt: now },
        status: { $in: [EventStatus.UPCOMING, EventStatus.ONGOING] },
        isActive: true,
      },
      {
        $set: { status: EventStatus.COMPLETED },
      },
    );

    this.logger.log(`Marked ${pastEvents.modifiedCount} events as completed`);
  }
}
