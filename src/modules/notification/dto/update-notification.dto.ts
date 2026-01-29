import { IsBoolean, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateNotificationDto {
  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  isRead?: boolean;
}
