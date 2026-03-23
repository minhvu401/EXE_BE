import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { PaymentService } from './payment.service';
import { PaymentController } from './payment.controller';
import { PaymentSchema } from './schemas/payment.schema';
import { PayOSService } from './payos.service';
import { PaymentScheduler } from './payment.scheduler';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: 'Payment',
        schema: PaymentSchema,
      },
    ]),
    ConfigModule,
    ScheduleModule.forRoot(),
  ],
  controllers: [PaymentController],
  providers: [PayOSService, PaymentService, PaymentScheduler],
  exports: [PaymentService],
})
export class PaymentModule {}
