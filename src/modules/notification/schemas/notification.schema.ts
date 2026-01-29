import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';

export enum NotificationType {
  APPLICATION_STATUS = 'APPLICATION_STATUS',
  CLUB_INVITATION = 'CLUB_INVITATION',
  EVENT_UPDATE = 'EVENT_UPDATE',
  NEW_POST = 'NEW_POST',
  SYSTEM_MESSAGE = 'SYSTEM_MESSAGE',
}

@Schema({ timestamps: true })
export class Notification extends Document {
  @ApiProperty({ example: new Types.ObjectId().toString() })
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @ApiProperty({ example: 'Your application has been approved' })
  @Prop({ required: true })
  title: string;

  @ApiProperty({
    example:
      'Congratulations! Your application for the club has been approved.',
  })
  @Prop({ required: true })
  message: string;

  @ApiProperty({
    enum: NotificationType,
    example: NotificationType.APPLICATION_STATUS,
  })
  @Prop({ enum: NotificationType, default: NotificationType.SYSTEM_MESSAGE })
  type: NotificationType;

  @ApiProperty({ example: false })
  @Prop({ default: false })
  isRead: boolean;

  @ApiProperty({ example: { applicationId: '123456' }, required: false })
  @Prop({ type: Object, default: {} })
  metadata?: Record<string, any>;

  @ApiProperty({ example: null, required: false })
  @Prop({ required: false })
  readAt?: Date;

  @ApiProperty()
  @Prop({ default: Date.now })
  createdAt: Date;

  @ApiProperty()
  @Prop({ default: Date.now })
  updatedAt: Date;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);
