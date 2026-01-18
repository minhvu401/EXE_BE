// user.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { User, UserSchema } from '../auth/schemas/user.schema';
import { UploadModule } from 'src/upload/upload.module';
import {
  ClubMember,
  ClubMemberSchema,
} from '../clubmems/schemas/club-member.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: ClubMember.name, schema: ClubMemberSchema },
    ]),
    UploadModule,
  ],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}
