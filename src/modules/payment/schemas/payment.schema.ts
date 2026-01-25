import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';

export enum PaymentStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

@Schema({ timestamps: true })
export class Payment extends Document {
  @ApiProperty({ example: '507f1f77bcf86cd799439011' })
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @ApiProperty({ example: 50000 })
  @Prop({ required: true })
  amount: number;

  @ApiProperty({ example: 'Thanh toán gói AI Premium' })
  @Prop({ required: true })
  description: string;

  @ApiProperty({ example: 'ai-premium-monthly' })
  @Prop({ required: false })
  packageType?: string;

  @ApiProperty({ enum: PaymentStatus, example: PaymentStatus.COMPLETED })
  @Prop({
    enum: PaymentStatus,
    default: PaymentStatus.PENDING,
  })
  status: PaymentStatus;

  @ApiProperty({ example: '20260125123456' })
  @Prop({ required: true, unique: true })
  transactionRef: string;

  @ApiProperty({ example: '00' })
  @Prop({ required: false })
  responseCode?: string;

  @ApiProperty()
  @Prop({ required: false })
  paymentUrl?: string;

  @ApiProperty()
  @Prop({ required: false })
  errorMessage?: string;

  createdAt: Date;
  updatedAt: Date;
}

export const PaymentSchema = SchemaFactory.createForClass(Payment);
