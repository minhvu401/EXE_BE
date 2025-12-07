import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, MaxLength } from 'class-validator';

export class RejectApplicationDto {
  @ApiProperty({
    example: 'Hồ sơ chưa phù hợp với yêu cầu của câu lạc bộ',
    description: 'Lý do từ chối',
    required: false,
  })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  rejectionReason?: string;
}
