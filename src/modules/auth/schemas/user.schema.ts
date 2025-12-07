import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString } from 'class-validator';
import { Role } from '../enum/role.enum';

@Schema({ timestamps: true })
export class User extends Document {
  @ApiProperty({ example: 'user@example.com' })
  @Prop({ required: true, unique: true })
  @IsEmail({}, { message: 'Invalid email format' })
  email: string;

  @ApiProperty({ example: '123456789' })
  @Prop({ required: true })
  password: string;

  @ApiProperty({ example: 'Nguyen Van A' })
  @Prop({ required: true })
  @IsString()
  fullName: string;

  @ApiProperty({ example: '0123456789' })
  @Prop({ required: false })
  phoneNumber?: string;

  @ApiProperty({ example: 'https://example.com/avatar.jpg' })
  @Prop({ required: false })
  avatarUrl?: string;

  @ApiProperty({ enum: Role, example: Role.USER })
  @Prop({ enum: Role, required: true })
  role: Role;

  //verify bằng EMAIL
  @ApiProperty({ example: false })
  @Prop({ required: true, default: false })
  isVerified: boolean;

  @ApiProperty({ example: true })
  @Prop({ required: true, default: true })
  isActive: boolean;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  @Prop({ required: false })
  deletedAt?: Date;

  // For Students
  @ApiProperty({ example: 'HCMUT' })
  @Prop({ required: false })
  school?: string;

  @ApiProperty({ example: 'Computer Science' })
  @Prop({ required: false })
  major?: string;

  @ApiProperty({ example: 4 })
  @Prop({ required: false })
  year?: number;

  @ApiProperty({ example: ['JavaScript', 'React', 'NodeJS'] })
  @Prop({ type: [String], required: false })
  skills?: string[];

  @ApiProperty({ example: ['Music', 'Sports', 'Technology'] })
  @Prop({ type: [String], required: false })
  interests?: string[];

  @ApiProperty()
  @Prop({
    type: [
      {
        clubId: { type: Types.ObjectId, ref: 'User' },
        joinedAt: { type: Date, default: Date.now },
        isActive: { type: Boolean, default: true },
        outDate: { type: Date, required: false },
      },
    ],
    required: false,
  })
  clubJoined?: {
    clubId: Types.ObjectId;
    joinedAt: Date;
    isActive: boolean;
    outDate?: Date;
  }[];

  // For Clubs
  @ApiProperty({ example: 'Technology' })
  @Prop({ required: false })
  category?: string;

  @ApiProperty({ example: 'A tech club for students' })
  @Prop({ required: false })
  description?: string;

  @ApiProperty({
    example: ['https://facebook.com/club', 'https://instagram.com/club'],
  })
  @Prop({ type: [String], required: false })
  socialLink?: string[];

  @ApiProperty()
  @Prop({
    type: [
      {
        postId: { type: Types.ObjectId, ref: 'Post' },
        title: String,
        createdAt: { type: Date, default: Date.now },
      },
    ],
    required: false,
  })
  posts?: {
    postId: Types.ObjectId;
    tags: string[];
    content: string;
    images: string[];
    like: number;
    isActive: boolean;
    title: string;
    createdAt: Date;
  }[];

  @ApiProperty()
  @Prop({
    type: {
      isActive: { type: Boolean, default: false },
      expiredAt: { type: Date, required: false },
      endDate: { type: Date, required: false },
    },
    required: false,
  })
  proPlan?: {
    isActive: boolean;
    expiredAt?: Date;
    endDate?: Date;
  };

  @ApiProperty({ example: 4.5 })
  @Prop({ required: false, default: 0 })
  rating?: number;

  createdAt: Date;
  updatedAt: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);
