import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';

@Schema({ timestamps: true })
export class Conversation extends Document {
  @ApiProperty({ example: 'Group Name' })
  @Prop({ required: false })
  name?: string;

  @ApiProperty({ example: 'Group description' })
  @Prop({ required: false })
  description?: string;

  @ApiProperty({ example: new Types.ObjectId().toString(), required: false })
  @Prop({ type: Types.ObjectId, ref: 'User' })
  createdBy?: Types.ObjectId;

  @ApiProperty({
    example: [new Types.ObjectId().toString(), new Types.ObjectId().toString()],
  })
  @Prop({
    type: [Types.ObjectId],
    ref: 'User',
    required: true,
  })
  participants: Types.ObjectId[];

  @ApiProperty({ example: 'group', enum: ['direct', 'group'] })
  @Prop({ enum: ['direct', 'group'], default: 'direct' })
  type: 'direct' | 'group';

  @ApiProperty({ example: new Types.ObjectId().toString(), required: false })
  @Prop({ type: Types.ObjectId, ref: 'User' })
  groupIcon?: Types.ObjectId;

  @ApiProperty({ example: new Types.ObjectId().toString(), required: false })
  @Prop({ type: Types.ObjectId, ref: 'Message' })
  lastMessage?: Types.ObjectId;

  @ApiProperty({ example: 'Hello, how are you?', required: false })
  @Prop({ required: false })
  lastMessageContent?: string;

  @ApiProperty({ example: new Types.ObjectId().toString(), required: false })
  @Prop({ type: Types.ObjectId, ref: 'User' })
  lastMessageSenderId?: Types.ObjectId;

  @ApiProperty()
  @Prop({ default: Date.now })
  lastMessageAt: Date;

  @ApiProperty()
  @Prop([{ type: Types.ObjectId, ref: 'User' }])
  mutedBy?: Types.ObjectId[];

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop({ default: Date.now })
  updatedAt: Date;
}

export const ConversationSchema = SchemaFactory.createForClass(Conversation);
