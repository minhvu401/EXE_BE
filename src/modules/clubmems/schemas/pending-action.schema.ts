import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ActionType = 'update_member' | 'remove_member' | 'update_role';

@Schema({ timestamps: true })
export class PendingAction extends Document {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  clubId: Types.ObjectId;

  @Prop({
    required: true,
    enum: ['update_member', 'remove_member', 'update_role'],
  })
  actionType: ActionType;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  targetMemberId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  initiatedById: Types.ObjectId;

  @Prop({ type: Object, required: true })
  actionData: Record<string, any>;

  @Prop({ type: [Types.ObjectId], ref: 'User', default: [] })
  adminApprovers: Types.ObjectId[];

  @Prop({ type: Types.ObjectId, ref: 'User' })
  approvedBy?: Types.ObjectId;

  @Prop({ type: Date })
  approvedAt?: Date;

  @Prop({ type: Boolean, default: false })
  isCompleted: boolean;

  @Prop({ type: Boolean, default: false })
  isRejected: boolean;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  rejectedBy?: Types.ObjectId;

  @Prop({ type: Date })
  rejectedAt?: Date;

  @Prop({ type: String })
  rejectionReason?: string;

  @Prop({
    type: Date,
    default: () => new Date(Date.now() + 24 * 60 * 60 * 1000),
  })
  expiresAt: Date;

  @Prop({ type: String })
  approvalToken: string;

  createdAt: Date;
  updatedAt: Date;
}

export const PendingActionSchema = SchemaFactory.createForClass(PendingAction);

// Index
PendingActionSchema.index({ clubId: 1 });
PendingActionSchema.index({ approvalToken: 1 });
PendingActionSchema.index({ isCompleted: 1 });
PendingActionSchema.index({ expiresAt: 1 });
