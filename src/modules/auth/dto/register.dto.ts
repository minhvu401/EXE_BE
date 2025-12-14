// register.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
  IsEnum,
  IsOptional,
} from 'class-validator';
import { Role } from '../enum/role.enum';

export class RegisterDto {
  @ApiProperty({ example: 'example@gmail.com' })
  @IsEmail({}, { message: 'Invalid email format' })
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  @MinLength(6, { message: 'Password must be at least 6 characters' })
  @IsNotEmpty()
  password: string;

  @ApiProperty({ example: 'Nguyen Van A' })
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @ApiProperty({ example: '0123456789' })
  @IsString()
  @IsOptional()
  phoneNumber?: string;

  @ApiProperty({ enum: Role, example: Role.USER })
  @IsEnum(Role)
  @IsNotEmpty()
  role: Role;

  // For Students (optional during registration)
  @ApiProperty({ example: 'FPTU', required: false })
  @IsString()
  @IsOptional()
  school?: string;

  @ApiProperty({ example: 'Software Engineer', required: false })
  @IsString()
  @IsOptional()
  major?: string;

  @ApiProperty({ example: 4, required: false })
  @IsOptional()
  year?: number;

  // For Clubs (optional during registration)
  @ApiProperty({ example: 'Technology', required: false })
  @IsString()
  @IsOptional()
  category?: string;

  @ApiProperty({ example: 'A tech club for students', required: false })
  @IsString()
  @IsOptional()
  description?: string;
}
