import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { PaymentService } from './payment.service';
import { PaymentController } from './payment.controller';
import { PaymentSchema } from './schemas/payment.schema';
import { SepayService } from './sepay.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: 'Payment',
        schema: PaymentSchema,
      },
    ]),
    ConfigModule,
  ],
  controllers: [PaymentController],
  providers: [SepayService, PaymentService],
  exports: [PaymentService],
})
export class PaymentModule {}
