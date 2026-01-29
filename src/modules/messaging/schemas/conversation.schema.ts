import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';

@Schema({ timestamps: true })
export class Conversation extends Document {
  @ApiProperty({
    example: [new Types.ObjectId().toString(), new Types.ObjectId().toString()],
  })
  @Prop({
    type: [Types.ObjectId],
    ref: 'User',
    required: true,
    validate: {
      validator: function (value: Types.ObjectId[]) {
        return value.length === 2;
      },
      message: 'Conversation must have exactly 2 participants',
    },
  })
  participants: Types.ObjectId[];

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
  @Prop({ default: Date.now })
  createdAt: Date;

  @ApiProperty()
  @Prop({ default: Date.now })
  updatedAt: Date;
}

export const ConversationSchema = SchemaFactory.createForClass(Conversation);
