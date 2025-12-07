import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class Post extends Document {
  @ApiProperty()
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  clubId: Types.ObjectId;

  @ApiProperty({ example: 'Thông báo tuyển thành viên' })
  @Prop({ required: true })
  title: string;

  @ApiProperty({ example: ['technology', 'education'] })
  @Prop({ type: [String], default: [] })
  tags: string[];

  @ApiProperty({
    example: 'Chúng tôi đang cần tuyển thêm thành viên cho câu lạc bộ...',
  })
  @Prop({ required: true })
  content: string;

  @ApiProperty({
    example: [
      'https://example.com/image1.jpg',
      'https://example.com/image2.jpg',
    ],
  })
  @Prop({ type: [String], default: [] })
  images: string[];

  @ApiProperty({ example: 0 })
  @Prop({ type: Number, default: 0 })
  like: number;

  @ApiProperty()
  @Prop({
    type: [{ userId: { type: Types.ObjectId, ref: 'User' }, likedAt: Date }],
    default: [],
  })
  likedBy: {
    userId: Types.ObjectId;
    likedAt: Date;
  }[];

  @ApiProperty({ example: true })
  @Prop({ type: Boolean, default: true })
  isActive: boolean;

  @ApiProperty()
  @Prop({ type: Date, required: false })
  deletedAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}

export const PostSchema = SchemaFactory.createForClass(Post);

// Indexes
PostSchema.index({ clubId: 1, isActive: 1 });
PostSchema.index({ createdAt: -1 });
PostSchema.index({ like: -1 });
