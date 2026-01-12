import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ClubMemberController } from './clubmems.controller';
import { ClubMemberService } from './clubmems.service';
import { ClubMember, ClubMemberSchema } from './schemas/club-member.schema';
import {
  PendingAction,
  PendingActionSchema,
} from './schemas/pending-action.schema';
import { User, UserSchema } from '../auth/schemas/user.schema';
import { MailService } from '../mail/mail.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ClubMember.name, schema: ClubMemberSchema },
      { name: PendingAction.name, schema: PendingActionSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [ClubMemberController],
  providers: [ClubMemberService, MailService],
  exports: [ClubMemberService],
})
export class ClubMemberModule {}
