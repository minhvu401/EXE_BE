import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ApplicationController } from './application.controller';
import { ApplicationService } from './application.service';
import { Application, ApplicationSchema } from './schemas/application.schema';
import { User, UserSchema } from '../auth/schemas/user.schema';
import {
  ClubMember,
  ClubMemberSchema,
} from '../clubmems/schemas/club-member.schema';
import { MailService } from '../mail/mail.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Application.name, schema: ApplicationSchema },
      { name: User.name, schema: UserSchema },
      { name: ClubMember.name, schema: ClubMemberSchema },
    ]),
  ],
  controllers: [ApplicationController],
  providers: [ApplicationService, MailService],
  exports: [ApplicationService],
})
export class ApplicationModule {}
