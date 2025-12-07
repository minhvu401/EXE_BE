import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  MinLength,
  MaxLength,
  IsArray,
  IsOptional,
  IsUrl,
} from 'class-validator';

export class UpdatePostDto {
  @ApiProperty({
    example: 'Thông báo cập nhật về tuyển thành viên',
    description: 'Tiêu đề bài viết',
    required: false,
  })
  @IsString()
  @MinLength(10, { message: 'Tiêu đề phải có ít nhất 10 ký tự' })
  @MaxLength(200, { message: 'Tiêu đề không được vượt quá 200 ký tự' })
  @IsOptional()
  title?: string;

  @ApiProperty({
    example: ['technology', 'innovation'],
    description: 'Danh sách thẻ (tags) liên quan đến bài viết',
    required: false,
  })
  @IsOptional()
  tags?: string[];

  @ApiProperty({
    example: 'Nội dung đã được cập nhật...',
    description: 'Nội dung bài viết',
    required: false,
  })
  @IsString()
  @MinLength(20, { message: 'Nội dung phải có ít nhất 20 ký tự' })
  @IsOptional()
  content?: string;

  @ApiProperty({
    example: ['https://example.com/new-image.jpg'],
    description: 'Danh sách URL hình ảnh',
    required: false,
  })
  @IsArray()
  @IsUrl({}, { each: true, message: 'URL hình ảnh không hợp lệ' })
  @IsOptional()
  images?: string[];
}
