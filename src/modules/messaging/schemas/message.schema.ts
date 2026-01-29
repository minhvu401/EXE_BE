import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';

@Schema({ timestamps: true })
export class Message extends Document {
  @ApiProperty({ example: new Types.ObjectId().toString() })
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  senderId: Types.ObjectId;

  @ApiProperty({ example: new Types.ObjectId().toString() })
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  recipientId: Types.ObjectId;

  @ApiProperty({ example: new Types.ObjectId().toString() })
  @Prop({ type: Types.ObjectId, ref: 'Conversation', required: true })
  conversationId: Types.ObjectId;

  @ApiProperty({ example: 'Hello, how are you?' })
  @Prop({ required: true })
  content: string;

  @ApiProperty({ example: false })
  @Prop({ default: false })
  isRead: boolean;

  @ApiProperty({ example: null, required: false })
  @Prop({ required: false })
  readAt?: Date;

  @ApiProperty({ example: null, required: false })
  @Prop({ required: false })
  editedAt?: Date;

  @ApiProperty()
  @Prop({ default: Date.now })
  createdAt: Date;

  @ApiProperty()
  @Prop({ default: Date.now })
  updatedAt: Date;
}

export const MessageSchema = SchemaFactory.createForClass(Message);
