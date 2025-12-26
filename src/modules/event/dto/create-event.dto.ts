import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  MinLength,
  MaxLength,
  IsDateString,
  IsNumber,
  Min,
  IsArray,
  IsUrl,
  IsOptional,
} from 'class-validator';

export class CreateEventDto {
  @ApiProperty({
    example: 'Workshop: Introduction to Web Development',
    description: 'Tiêu đề sự kiện',
  })
  @IsNotEmpty({ message: 'Tiêu đề không được để trống' })
  @IsString()
  @MinLength(10, { message: 'Tiêu đề phải có ít nhất 10 ký tự' })
  @MaxLength(200, { message: 'Tiêu đề không được vượt quá 200 ký tự' })
  title: string;

  @ApiProperty({
    example:
      'Join us for an exciting workshop about web development basics. Learn HTML, CSS, and JavaScript!',
    description: 'Mô tả sự kiện',
  })
  @IsNotEmpty({ message: 'Mô tả không được để trống' })
  @IsString()
  @MinLength(20, { message: 'Mô tả phải có ít nhất 20 ký tự' })
  description: string;

  @ApiProperty({
    example: 'Room A101, Building B, FPTU Campus',
    description: 'Địa điểm tổ chức',
  })
  @IsNotEmpty({ message: 'Địa điểm không được để trống' })
  @IsString()
  location: string;

  @ApiProperty({
    example: '2025-12-20T14:00:00.000Z',
    description: 'Thời gian diễn ra sự kiện',
  })
  @IsNotEmpty({ message: 'Thời gian không được để trống' })
  @IsDateString()
  time: string;

  @ApiProperty({
    example: 50,
    description: 'Số lượng người tham gia tối đa',
  })
  @IsNotEmpty({ message: 'Số lượng tối đa không được để trống' })
  @IsNumber()
  @Min(1, { message: 'Số lượng tối đa phải lớn hơn 0' })
  maxParticipants: number;

  @ApiProperty({
    example: ['https://example.com/banner.jpg'],
    description: 'Danh sách URL hình ảnh',
    required: false,
  })
  @IsArray()
  @IsUrl({}, { each: true, message: 'URL hình ảnh không hợp lệ' })
  @IsOptional()
  images?: string[];
}
