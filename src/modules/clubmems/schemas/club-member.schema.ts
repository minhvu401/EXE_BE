// club-member.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class ClubMember extends Document {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  clubId: Types.ObjectId;

  @Prop({
    type: [
      {
        userId: { type: Types.ObjectId, ref: 'User' },
        email: String,
        fullName: String,
        phoneNumber: String,
        avatarUrl: String,
        school: String,
        major: String,
        year: Number,
        skills: [String],
        interests: [String],
        joinedAt: { type: Date, default: Date.now },
        isActive: { type: Boolean, default: true },
        outDate: Date,
      },
    ],
    default: [],
  })
  users: {
    userId: Types.ObjectId;
    email: string;
    fullName: string;
    phoneNumber?: string;
    avatarUrl?: string;
    school?: string;
    major?: string;
    year?: number;
    skills?: string[];
    interests?: string[];
    joinedAt: Date;
    isActive: boolean;
    outDate?: Date;
  }[];

  @Prop({ type: Number, default: 0 })
  quantity: number;

  createdAt: Date;
  updatedAt: Date;
}

export const ClubMemberSchema = SchemaFactory.createForClass(ClubMember);

// Index
ClubMemberSchema.index({ clubId: 1 });
