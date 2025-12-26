import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';
import { EventController } from './event.controller';
import { EventService } from './event.service';
import { Event, EventSchema } from './schema/event.schema';
import { User, UserSchema } from '../auth/schemas/user.schema';
import { MailService } from '../mail/mail.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Event.name, schema: EventSchema },
      { name: User.name, schema: UserSchema },
    ]),
    ScheduleModule.forRoot(), // Enable scheduled jobs
  ],
  controllers: [EventController],
  providers: [EventService, MailService],
  exports: [EventService],
})
export class EventModule {}
