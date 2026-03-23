import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PaymentService } from './payment.service';

@Injectable()
export class PaymentScheduler {
  private logger = new Logger('PaymentScheduler');

  constructor(private paymentService: PaymentService) {}

  /**
   * Auto-sync tất cả pending payments mỗi 30 giây
   * Kiểm tra xem có payment nào đã hoàn tất trên PayOS chưa
   * Giúp realtime update status nhanh chóng
   */
  @Cron(CronExpression.EVERY_30_SECONDS)
  async syncPendingPayments() {
    this.logger.debug('Running scheduled payment sync...');
    await this.paymentService.syncAllPendingPayments();
  }
}
