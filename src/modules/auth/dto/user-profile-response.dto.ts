// user-profile-response.dto.ts
import { ApiProperty } from '@nestjs/swagger';

export class ClubInfoDto {
  @ApiProperty({ description: 'Club ID' })
  clubId: string;

  @ApiProperty({ example: 'Tech Club FPTU' })
  clubName: string;

  @ApiProperty({ example: 'Technology' })
  category?: string;

  @ApiProperty({ example: 'https://example.com/club-avatar.jpg' })
  clubAvatarUrl?: string;

  @ApiProperty({
    enum: ['admin', 'moderator', 'member'],
    example: 'member',
  })
  role: string;

  @ApiProperty({ description: 'Date when user joined this club' })
  joinedAt: Date;

  @ApiProperty({ description: 'Is user currently active in this club' })
  isActive: boolean;

  @ApiProperty({ description: 'Date when user left the club (if any)' })
  outDate?: Date;
}

export class UserProfileResponseDto {
  @ApiProperty({ description: 'User ID' })
  _id: string;

  @ApiProperty({ example: 'user@example.com' })
  email: string;

  @ApiProperty({ example: 'Nguyen Van A' })
  fullName: string;

  @ApiProperty({ example: '0123456789' })
  phoneNumber?: string;

  @ApiProperty({ example: 'https://example.com/avatar.jpg' })
  avatarUrl?: string;

  @ApiProperty({ enum: ['user', 'club', 'admin'], example: 'user' })
  role: string;

  @ApiProperty()
  isVerified: boolean;

  @ApiProperty()
  isActive: boolean;

  // Student info
  @ApiProperty({ example: 'FPTU' })
  school?: string;

  @ApiProperty({ example: 'Software Engineering' })
  major?: string;

  @ApiProperty({ example: 4 })
  year?: number;

  @ApiProperty({ example: ['JavaScript', 'React', 'NodeJS'] })
  skills?: string[];

  @ApiProperty({ example: ['Music', 'Sports', 'Technology'] })
  interests?: string[];

  // Club info
  @ApiProperty({ example: 'Technology Club' })
  category?: string;

  @ApiProperty({ example: 'A tech club for students at FPTU' })
  description?: string;

  @ApiProperty({
    example: ['https://facebook.com/club', 'https://instagram.com/club'],
  })
  socialLink?: string[];

  @ApiProperty({
    description:
      'List of clubs this user has joined with their roles in each club',
    type: [ClubInfoDto],
  })
  clubsJoined: ClubInfoDto[];

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
