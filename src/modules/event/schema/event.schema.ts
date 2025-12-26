import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { Document, Types } from 'mongoose';
import { EventStatus } from '../enum/event.enum';

@Schema({ timestamps: true })
export class Event extends Document {
  @ApiProperty()
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  clubId: Types.ObjectId;

  @ApiProperty({ example: 'Workshop: Introduction to Web Development' })
  @Prop({ required: true })
  title: string;

  @ApiProperty({
    example: 'Join us for an exciting workshop about web development basics...',
  })
  @Prop({ required: true })
  description: string;

  @ApiProperty({ example: 'Hall A, FPT University' })
  @Prop({ required: true })
  location: string;

  @ApiProperty({ example: '2025-12-20T14:00:00.000Z' })
  @Prop({ required: true })
  time: Date;

  @ApiProperty({ example: 50 })
  @Prop({ required: true, min: 1 })
  maxParticipants: number;

  @ApiProperty({ example: ['https://example.com/event-banner.jpg'] })
  @Prop({ type: [String], default: [] })
  images: string[];

  @ApiProperty()
  @Prop({
    type: [
      {
        userId: { type: Types.ObjectId, ref: 'User' },
        email: String,
        fullName: String,
        phoneNumber: String,
        registeredAt: { type: Date, default: Date.now },
        checkedIn: { type: Boolean, default: false },
        checkedInAt: Date,
      },
    ],
    default: [],
  })
  joinedUsers: {
    userId: Types.ObjectId;
    email: string;
    fullName: string;
    phoneNumber?: string;
    registeredAt: Date;
    checkedIn: boolean;
    checkedInAt?: Date;
  }[];

  @ApiProperty()
  @Prop({
    type: [
      {
        userId: { type: Types.ObjectId, ref: 'User' },
        email: String,
        fullName: String,
        reason: String,
        cancelledAt: { type: Date, default: Date.now },
      },
    ],
    default: [],
  })
  cancelledUsers: {
    userId: Types.ObjectId;
    email: string;
    fullName: string;
    reason: string;
    cancelledAt: Date;
  }[];

  @ApiProperty({ enum: EventStatus, example: EventStatus.UPCOMING })
  @Prop({
    type: String,
    enum: EventStatus,
    default: EventStatus.UPCOMING,
  })
  status: EventStatus;

  @ApiProperty({ example: true })
  @Prop({ type: Boolean, default: true })
  isActive: boolean;

  @ApiProperty()
  @Prop({ type: Date, required: false })
  deletedAt?: Date;

  @ApiProperty({ example: false })
  @Prop({ type: Boolean, default: false })
  reminderSent: boolean;

  createdAt: Date;
  updatedAt: Date;
}
export const EventSchema = SchemaFactory.createForClass(Event);

// Indexes
EventSchema.index({ clubId: 1, isActive: 1 });
EventSchema.index({ time: 1 });
EventSchema.index({ status: 1 });
EventSchema.index({ time: 1, reminderSent: 1 });
