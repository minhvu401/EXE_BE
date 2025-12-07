import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsDateString,
  IsString,
  IsOptional,
} from 'class-validator';

export class ApproveApplicationDto {
  @ApiProperty({
    example: '2025-12-01T10:00:00.000Z',
    description: 'Ngày giờ phỏng vấn',
  })
  @IsNotEmpty({ message: 'Interview date is required' })
  @IsDateString()
  interviewDate: string;

  @ApiProperty({
    example: 'Phòng A101, Tòa nhà B',
    description: 'Địa điểm phỏng vấn',
    required: false,
  })
  @IsString()
  @IsOptional()
  interviewLocation?: string;

  @ApiProperty({
    example: 'Vui lòng mang theo CV và portfolio',
    description: 'Ghi chú cho buổi phỏng vấn',
    required: false,
  })
  @IsString()
  @IsOptional()
  interviewNote?: string;
}
