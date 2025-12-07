import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsString, IsOptional } from 'class-validator';

export enum FinalDecision {
  ACCEPTED = 'accepted',
  DECLINED = 'declined',
}

export class FinalDecisionDto {
  @ApiProperty({
    enum: FinalDecision,
    example: FinalDecision.ACCEPTED,
    description: 'Quyết định cuối cùng sau phỏng vấn',
  })
  @IsEnum(FinalDecision)
  decision: FinalDecision;

  @ApiProperty({
    example: 'Ứng viên chưa đạt yêu cầu về kỹ năng (nếu declined)',
    description: 'Lý do từ chối (nếu declined)',
    required: false,
  })
  @IsString()
  @IsOptional()
  rejectionReason?: string;
}
