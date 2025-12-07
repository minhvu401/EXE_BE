import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { Document, Types } from 'mongoose';
import { ApplicationStatus } from '../enum/application.enum';

@Schema({ timestamps: true })
export class Application extends Document {
  @ApiProperty()
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  clubId: Types.ObjectId;

  @ApiProperty()
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @ApiProperty({ example: 'Tôi muốn gia nhập để học hỏi thêm về lập trình' })
  @Prop({ required: true })
  reason: string;

  @ApiProperty({ enum: ApplicationStatus, example: ApplicationStatus.PENDING })
  @Prop({
    type: String,
    enum: ApplicationStatus,
    default: ApplicationStatus.PENDING,
  })
  status: ApplicationStatus;

  @ApiProperty()
  @Prop({ type: Date })
  submittedAt: Date;

  @ApiProperty()
  @Prop({ type: Date, required: false })
  interviewDate?: Date;

  @ApiProperty()
  @Prop({ type: String, required: false })
  interviewLocation?: string;

  @ApiProperty()
  @Prop({ type: String, required: false })
  interviewNote?: string;

  @ApiProperty()
  @Prop({ type: Date, required: false })
  respondedAt?: Date;

  @ApiProperty()
  @Prop({ type: String, required: false })
  rejectionReason?: string;

  createdAt: Date;
  updatedAt: Date;
}
export const ApplicationSchema = SchemaFactory.createForClass(Application);

// Index for faster queries
ApplicationSchema.index({ clubId: 1, userId: 1 });
ApplicationSchema.index({ status: 1 });
