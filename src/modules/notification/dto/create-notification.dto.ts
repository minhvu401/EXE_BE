import { IsString, IsEnum, IsOptional, IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { NotificationType } from '../schemas/notification.schema';
import { Types } from 'mongoose';

export class CreateNotificationDto {
  @ApiProperty({ example: new Types.ObjectId().toString() })
  userId: string;

  @ApiProperty({ example: 'Your application has been approved' })
  @IsString()
  title: string;

  @ApiProperty({
    example:
      'Congratulations! Your application for the club has been approved.',
  })
  @IsString()
  message: string;

  @ApiProperty({
    enum: NotificationType,
    example: NotificationType.APPLICATION_STATUS,
  })
  @IsEnum(NotificationType)
  type: NotificationType;

  @ApiProperty({ example: { applicationId: '123456' }, required: false })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
