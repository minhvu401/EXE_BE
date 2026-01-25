import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsOptional, IsString } from 'class-validator';

export class GetClubRecommendationDto {
  @ApiProperty({
    example: ['JavaScript', 'React', 'Node.js'],
    description: 'Kỹ năng của người dùng',
    isArray: true,
  })
  @IsArray()
  skills: string[];

  @ApiProperty({
    example: ['Technology', 'Programming', 'Web Development'],
    description: 'Sở thích của người dùng',
    isArray: true,
  })
  @IsArray()
  interests: string[];

  @ApiProperty({
    example: 5,
    description: 'Số lượng gợi ý muốn nhận (mặc định 5)',
    required: false,
  })
  @IsOptional()
  limit?: number;

  @ApiProperty({
    example: 'Tôi là sinh viên CNTT và muốn tìm câu lạc bộ về công nghệ',
    description: 'Thông tin bổ sung về người dùng (tuỳ chọn)',
    required: false,
  })
  @IsOptional()
  @IsString()
  additionalInfo?: string;
}
