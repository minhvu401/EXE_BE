import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';

export enum MessageType {
  TEXT = 'text',
  IMAGE = 'image',
  FILE = 'file',
  VIDEO = 'video',
  AUDIO = 'audio',
}

@Schema({ timestamps: true })
export class Message extends Document {
  @ApiProperty({ example: new Types.ObjectId().toString() })
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  senderId: Types.ObjectId;

  @ApiProperty({ example: new Types.ObjectId().toString() })
  @Prop({ type: Types.ObjectId, ref: 'Conversation', required: true })
  conversationId: Types.ObjectId;

  @ApiProperty({ example: 'Hello, how are you?' })
  @Prop({ required: true })
  content: string;

  @ApiProperty({ enum: ['text', 'image', 'file', 'video', 'audio'] })
  @Prop({ enum: MessageType, default: MessageType.TEXT })
  type: MessageType;

  // Cho replies/threads
  @ApiProperty({ example: new Types.ObjectId().toString(), required: false })
  @Prop({ type: Types.ObjectId, ref: 'Message', required: false })
  parentMessageId?: Types.ObjectId;

  @ApiProperty({ example: false })
  @Prop({ default: false })
  isRead: boolean;

  @ApiProperty({ example: null, required: false })
  @Prop({ required: false })
  readAt?: Date;

  @ApiProperty({ example: null, required: false })
  @Prop({ required: false })
  editedAt?: Date;

  @ApiProperty({ example: false })
  @Prop({ default: false })
  isPinned: boolean;

  @ApiProperty({ example: null, required: false })
  @Prop({ required: false })
  pinnedAt?: Date;

  @ApiProperty({ example: null, required: false })
  @Prop({ type: Types.ObjectId, ref: 'User' })
  pinnedBy?: Types.ObjectId;

  // Reactions like emoji
  @ApiProperty({
    example: [{ emoji: '👍', users: [new Types.ObjectId().toString()] }],
    required: false,
  })
  @Prop({
    type: [
      {
        emoji: String,
        users: [{ type: Types.ObjectId, ref: 'User' }],
      },
    ],
    default: [],
  })
  reactions?: Array<{
    emoji: string;
    users: Types.ObjectId[];
  }>;

  // Attachments
  @ApiProperty({
    example: [
      {
        url: 'https://...',
        type: 'image',
        name: 'photo.jpg',
      },
    ],
    required: false,
  })
  @Prop({
    type: [
      {
        url: String,
        type: { type: String },
        name: String,
        size: { type: Number, required: false },
      },
    ],
    default: [],
  })
  attachments?: Array<{
    url: string;
    type: string;
    name: string;
    size?: number;
  }>;

  // Có thể sử dụng cho việc soft delete hoặc archiving
  @ApiProperty({ example: false })
  @Prop({ default: false })
  isDeleted: boolean;

  @ApiProperty({ example: null, required: false })
  @Prop({ required: false })
  deletedAt?: Date;

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop({ default: Date.now })
  updatedAt: Date;
}

export const MessageSchema = SchemaFactory.createForClass(Message);
