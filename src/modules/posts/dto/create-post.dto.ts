import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreatePostDto {
  @ApiProperty({
    example: 'Thông báo tuyển thành viên',
    description: 'Tiêu đề bài viết',
  })
  @IsNotEmpty({ message: 'Tiêu đề không được để trống' })
  @IsString()
  @MinLength(5, { message: 'Tiêu đề phải có ít nhất 5 ký tự' })
  @MaxLength(200, { message: 'Tiêu đề không được vượt quá 200 ký tự' })
  title: string;

  @ApiProperty({
    example: ['technology', 'education'],
    description: 'Danh sách thẻ (tags) liên quan đến bài viết',
  })
  @IsNotEmpty({ message: 'Tags không được để trống' })
  tags: string[];

  @ApiProperty({
    example:
      'Câu lạc bộ Công nghệ đang tuyển thành viên mới cho kỳ Spring 2025. Chúng tôi tìm kiếm những bạn có đam mê với công nghệ...',
    description: 'Nội dung bài viết',
  })
  @IsNotEmpty({ message: 'Nội dung không được để trống' })
  @IsString()
  @MinLength(20, { message: 'Nội dung phải có ít nhất 20 ký tự' })
  content: string;

  @ApiProperty({
    example: [
      'https://example.com/image1.jpg',
      'https://example.com/image2.jpg',
    ],
    description: 'Danh sách URL hình ảnh',
    required: false,
  })
  @IsArray()
  @IsUrl({}, { each: true, message: 'URL hình ảnh không hợp lệ' })
  @IsOptional()
  images?: string[];
}
