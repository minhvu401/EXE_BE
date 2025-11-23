// update-profile.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsArray, IsNumber } from 'class-validator';

export class UpdateStudentProfileDto {
  @ApiProperty({ example: 'Nguyen Van A', required: false })
  @IsString()
  @IsOptional()
  fullName?: string;

  @ApiProperty({ example: '0123456789', required: false })
  @IsString()
  @IsOptional()
  phoneNumber?: string;

  @ApiProperty({ example: 'https://example.com/avatar.jpg', required: false })
  @IsString()
  @IsOptional()
  avatarUrl?: string;

  @ApiProperty({ example: 'FPTU', required: false })
  @IsString()
  @IsOptional()
  school?: string;

  @ApiProperty({ example: 'Software Engineering', required: false })
  @IsString()
  @IsOptional()
  major?: string;

  @ApiProperty({ example: 2024, required: false })
  @IsNumber()
  @IsOptional()
  year?: number;

  @ApiProperty({ example: ['JavaScript', 'React', 'NodeJS'], required: false })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  skills?: string[];

  @ApiProperty({ example: ['Music', 'Sports', 'Technology'], required: false })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  interests?: string[];
}

export class UpdateClubProfileDto {
  @ApiProperty({ example: 'Tech Club FPTU', required: false })
  @IsString()
  @IsOptional()
  fullName?: string;

  @ApiProperty({ example: '0123456789', required: false })
  @IsString()
  @IsOptional()
  phoneNumber?: string;

  @ApiProperty({ example: 'https://example.com/avatar.jpg', required: false })
  @IsString()
  @IsOptional()
  avatarUrl?: string;

  @ApiProperty({ example: 'Technology', required: false })
  @IsString()
  @IsOptional()
  category?: string;

  @ApiProperty({ example: 'A tech club for students at FPTU', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    example: ['https://facebook.com/club', 'https://instagram.com/club'],
    required: false,
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  socialLink?: string[];
}
