import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Notification } from './schemas/notification.schema';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { GetNotificationsDto } from './dto/get-notifications.dto';
import { UpdateNotificationDto } from './dto/update-notification.dto';

@Injectable()
export class NotificationService {
  constructor(
    @InjectModel(Notification.name)
    private notificationModel: Model<Notification>,
  ) {}

  async create(
    createNotificationDto: CreateNotificationDto,
  ): Promise<Notification> {
    const notification = new this.notificationModel(createNotificationDto);
    return notification.save();
  }

  async getUserNotifications(
    userId: string,
    query: GetNotificationsDto,
  ): Promise<{
    data: Notification[];
    total: number;
    page: number;
    limit: number;
  }> {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    const filter: { userId: Types.ObjectId; isRead?: boolean } = {
      userId: new Types.ObjectId(userId),
    };

    if (query.isRead !== undefined) {
      filter.isRead = query.isRead;
    }

    const [data, total] = await Promise.all([
      this.notificationModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean() as unknown as Promise<Notification[]>,
      this.notificationModel.countDocuments(filter),
    ]);

    return {
      data,
      total,
      page,
      limit,
    };
  }

  async getNotificationById(
    notificationId: string,
  ): Promise<Notification | null> {
    return this.notificationModel.findById(notificationId);
  }

  async markAsRead(notificationId: string): Promise<Notification | null> {
    return this.notificationModel.findByIdAndUpdate(
      notificationId,
      { isRead: true, readAt: new Date() },
      { new: true },
    );
  }

  async markAsUnread(notificationId: string): Promise<Notification | null> {
    return this.notificationModel.findByIdAndUpdate(
      notificationId,
      { isRead: false, readAt: null },
      { new: true },
    );
  }

  async markAllAsRead(userId: string): Promise<void> {
    await this.notificationModel.updateMany(
      { userId: new Types.ObjectId(userId), isRead: false },
      { isRead: true, readAt: new Date() },
    );
  }

  async deleteNotification(notificationId: string): Promise<void> {
    await this.notificationModel.findByIdAndDelete(notificationId);
  }

  async deleteAllUserNotifications(userId: string): Promise<void> {
    await this.notificationModel.deleteMany({
      userId: new Types.ObjectId(userId),
    });
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.notificationModel.countDocuments({
      userId: new Types.ObjectId(userId),
      isRead: false,
    });
  }

  async updateNotification(
    notificationId: string,
    updateNotificationDto: UpdateNotificationDto,
  ): Promise<Notification | null> {
    const updateData: Partial<Notification> = { ...updateNotificationDto };

    if (updateNotificationDto.isRead === false) {
      updateData.readAt = undefined;
    } else if (updateNotificationDto.isRead === true) {
      updateData.readAt = new Date();
    }

    return this.notificationModel.findByIdAndUpdate(
      notificationId,
      updateData,
      {
        new: true,
      },
    );
  }
}
