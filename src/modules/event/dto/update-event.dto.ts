import { ApiProperty } from '@nestjs/swagger';
import {
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

export class UpdateEventDto {
  @ApiProperty({
    example: 'Workshop: Advanced Web Development',
    required: false,
  })
  @IsString()
  @MinLength(10, { message: 'Tiêu đề phải có ít nhất 10 ký tự' })
  @MaxLength(200, { message: 'Tiêu đề không được vượt quá 200 ký tự' })
  @IsOptional()
  title?: string;

  @ApiProperty({
    example: 'Updated description...',
    required: false,
  })
  @IsString()
  @MinLength(20, { message: 'Mô tả phải có ít nhất 20 ký tự' })
  @IsOptional()
  description?: string;

  @ApiProperty({
    example: 'Room B202, Building C',
    required: false,
  })
  @IsString()
  @IsOptional()
  location?: string;

  @ApiProperty({
    example: '2025-12-21T14:00:00.000Z',
    required: false,
  })
  @IsDateString()
  @IsOptional()
  time?: string;

  @ApiProperty({
    example: 100,
    required: false,
  })
  @IsNumber()
  @Min(1, { message: 'Số lượng tối đa phải lớn hơn 0' })
  @IsOptional()
  maxParticipants?: number;

  @ApiProperty({
    example: ['https://example.com/new-banner.jpg'],
    required: false,
  })
  @IsArray()
  @IsUrl({}, { each: true, message: 'URL hình ảnh không hợp lệ' })
  @IsOptional()
  images?: string[];
}
