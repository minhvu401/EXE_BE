// remove-member.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength, MaxLength } from 'class-validator';

export class RemoveMemberDto {
  @ApiProperty({
    example: '507f1f77bcf86cd799439011',
    description: 'ID của member cần remove',
  })
  @IsNotEmpty({ message: 'User ID is required' })
  @IsString()
  userId: string;

  @ApiProperty({
    example: 'Vi phạm nội quy câu lạc bộ',
    description: 'Lý do remove member',
  })
  @IsNotEmpty({ message: 'Lý do không được để trống' })
  @IsString()
  @MinLength(10, { message: 'Lý do phải có ít nhất 10 ký tự' })
  @MaxLength(500, { message: 'Lý do không được vượt quá 500 ký tự' })
  reason: string;
}
