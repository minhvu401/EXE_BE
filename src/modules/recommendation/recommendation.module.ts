import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { RecommendationService } from './recommendation.service';
import { RecommendationController } from './recommendation.controller';
import { geminiProvider } from '../../config/groq.config';
import { UserSchema } from '../auth/schemas/user.schema';
import { PaymentModule } from '../payment/payment.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: 'User',
        schema: UserSchema,
      },
    ]),
    ConfigModule,
    PaymentModule,
  ],
  controllers: [RecommendationController],
  providers: [RecommendationService, geminiProvider],
  exports: [RecommendationService],
})
export class RecommendationModule {}
