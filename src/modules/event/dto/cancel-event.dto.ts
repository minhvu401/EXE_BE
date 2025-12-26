import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength, MaxLength } from 'class-validator';

export class CancelRegistrationDto {
  @ApiProperty({
    example: 'Tôi có việc đột xuất không thể tham gia được',
    description: 'Lý do hủy đăng ký',
  })
  @IsNotEmpty({ message: 'Lý do không được để trống' })
  @IsString()
  @MinLength(10, { message: 'Lý do phải có ít nhất 10 ký tự' })
  @MaxLength(500, { message: 'Lý do không được vượt quá 500 ký tự' })
  reason: string;
}
