import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateApplicationDto {
  @ApiProperty({
    example: '507f1f77bcf86cd799439011',
    description: 'ID của câu lạc bộ muốn tham gia',
  })
  @IsNotEmpty({ message: 'Club ID is required' })
  @IsString()
  clubId: string;

  @ApiProperty({
    example:
      'Tôi rất yêu thích công nghệ và muốn học hỏi thêm về lập trình web',
    description: 'Lý do muốn gia nhập câu lạc bộ',
  })
  @IsNotEmpty({ message: 'Reason is required' })
  @IsString()
  @MaxLength(500, { message: 'Lý do không được vượt quá 500 ký tự' })
  reason: string;
}
