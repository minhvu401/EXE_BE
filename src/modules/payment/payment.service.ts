/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { Payment, PaymentStatus } from './schemas/payment.schema';
import { PayOSService } from './payos.service';
import { CreatePaymentDto } from './dto/create-payment.dto';

@Injectable()
export class PaymentService {
  private logger = new Logger('PaymentService');

  constructor(
    @InjectModel('Payment') private paymentModel: Model<Payment>,
    private configService: ConfigService,
    private payosService: PayOSService,
  ) {
    // Get frontend URL from env
    const frontendUrl = this.configService.get<string>('FRONTEND_URL');
    if (!frontendUrl) {
      this.logger.warn(
        'FRONTEND_URL not configured. Payment success redirects may not work properly. Set FRONTEND_URL in .env',
      );
    }
  }

  /**
   * Tạo đơn thanh toán mới và payment link
   */
  async createPayment(
    userId: string,
    createPaymentDto: CreatePaymentDto,
  ): Promise<{
    _id: string;
    orderCode: number;
    amount: number;
    description: string;
    checkoutUrl: string;
  }> {
    // Generate unique order code
    const orderCode = Math.floor(Date.now() / 1000);
    const transactionRef = `AI${orderCode}`;

    // Create payment object in database
    const payment = new this.paymentModel({
      userId: new Types.ObjectId(userId),
      amount: createPaymentDto.amount,
      description: createPaymentDto.description,
      packageType: createPaymentDto.packageType,
      transactionRef,
      status: PaymentStatus.PENDING,
    });

    await payment.save();

    // Create payment link via PayOS
    // Use frontend URL for redirects
    const frontendUrl = this.configService.get<string>(
      'FRONTEND_URL',
      'https://clubverse-ten.vercel.app',
    );
    const returnUrl = `${frontendUrl}/payment-success?orderCode=${orderCode}`;
    const cancelUrl = `${frontendUrl}/payment-cancel?orderCode=${orderCode}`;

    const paymentLinkRequest = {
      orderCode,
      amount: createPaymentDto.amount,
      description: createPaymentDto.description,
      returnUrl,
      cancelUrl,
      items: [
        {
          name: createPaymentDto.description,
          price: createPaymentDto.amount,
          quantity: 1,
        },
      ],
    };

    const paymentLink =
      await this.payosService.createPaymentLink(paymentLinkRequest);

    // Update payment with PayOS data
    payment.paymentUrl = paymentLink.checkoutUrl;
    await payment.save();

    this.logger.debug('Payment created:', {
      _id: payment._id.toString(),
      orderCode,
      checkoutUrl: paymentLink.checkoutUrl,
    });

    return {
      _id: payment._id.toString(),
      orderCode,
      amount: createPaymentDto.amount,
      description: createPaymentDto.description,
      checkoutUrl: paymentLink.checkoutUrl,
    };
  }

  /**
   * Xử lý webhook từ PayOS
   */
  async handlePayOSWebhook(body: any) {
    this.logger.debug('Received PayOS webhook:', body);

    const webhookData = this.payosService.parseWebhookData(body);

    if (!webhookData) {
      return {
        success: false,
        message: 'Invalid webhook signature',
      };
    }

    // Find payment by orderCode
    const orderCode = webhookData.orderCode.toString();
    const payment = await this.paymentModel.findOne({
      transactionRef: `AI${orderCode}`,
    });

    if (!payment) {
      this.logger.warn('Payment not found for orderCode:', orderCode);
      return {
        success: false,
        message: 'Payment not found',
        orderCode,
      };
    }

    // Verify amount
    if (payment.amount !== webhookData.amount) {
      this.logger.warn('Amount mismatch:', {
        dbAmount: payment.amount,
        webhookAmount: webhookData.amount,
      });
      return {
        success: false,
        message: 'Amount mismatch',
        dbAmount: payment.amount,
        webhookAmount: webhookData.amount,
      };
    }

    // Update payment status
    // PayOS webhook indicates successful payment
    payment.status = PaymentStatus.COMPLETED;
    payment.responseCode = webhookData.code;
    await payment.save();

    this.logger.debug('Payment updated to completed:', {
      transactionRef: payment.transactionRef,
      orderCode,
    });

    return {
      success: true,
      message: 'Payment completed',
      payment: {
        _id: payment._id,
        transactionRef: payment.transactionRef,
        amount: payment.amount,
        status: payment.status,
        userId: payment.userId,
      },
    };
  }

  /**
   * Kiểm tra user đã thanh toán chưa
   */
  async hasUserPaid(userId: string): Promise<boolean> {
    const payment = await this.paymentModel.findOne({
      userId: new Types.ObjectId(userId),
      status: PaymentStatus.COMPLETED,
    });

    return !!payment;
  }

  /**
   * Lấy lịch sử thanh toán
   */
  async getPaymentHistory(userId: string) {
    return this.paymentModel
      .find({ userId: new Types.ObjectId(userId) })
      .sort({ createdAt: -1 });
  }

  /**
   * Lấy thông tin thanh toán
   */
  async getPaymentDetail(transactionRef: string) {
    return this.paymentModel.findOne({ transactionRef });
  }

  /**
   * Get payment status
   */
  async getPaymentStatus(orderCode: number) {
    try {
      const paymentLink = await this.payosService.getPaymentLink(orderCode);

      const payment = await this.paymentModel.findOne({
        transactionRef: `AI${orderCode}`,
      });

      return {
        orderCode,
        paymentStatus: paymentLink.status,
        dbStatus: payment?.status,
        amountPaid: paymentLink.amountPaid,
        amount: paymentLink.amount,
      };
    } catch (error) {
      this.logger.error('Get payment status error:', error);
      throw error;
    }
  }

  /**
   * Sync payment status từ PayOS API
   * Gọi khi frontend vào trang payment success để update status từ PayOS
   */
  async syncPaymentStatus(orderCode: number) {
    try {
      this.logger.debug('Syncing payment status with PayOS:', orderCode);

      // Query payment status từ PayOS
      let payosPaymentLink;
      try {
        payosPaymentLink = await this.payosService.getPaymentLink(orderCode);
      } catch (getPaymentLinkError) {
        this.logger.error('Failed to get payment link from PayOS:', {
          orderCode,
          error:
            getPaymentLinkError instanceof Error
              ? getPaymentLinkError.message
              : String(getPaymentLinkError),
        });
        throw new BadRequestException(
          `Unable to check payment status from PayOS: ${getPaymentLinkError instanceof Error ? getPaymentLinkError.message : 'Unknown error'}`,
        );
      }
      // Find payment in database
      const payment = await this.paymentModel.findOne({
        transactionRef: `AI${orderCode}`,
      });

      if (!payment) {
        this.logger.warn('Payment not found for orderCode:', orderCode);
        return {
          success: false,
          message: 'Payment not found',
          orderCode,
        };
      }

      // Update payment status based on PayOS status
      // PayOS can return 'COMPLETED' or 'PAID' for successful payments
      if (
        payosPaymentLink.status === 'COMPLETED' ||
        payosPaymentLink.status === 'PAID'
      ) {
        payment.status = PaymentStatus.COMPLETED;
        payment.amountPaid = payosPaymentLink.amountPaid;
        await payment.save();
        return {
          success: true,
          message: 'Payment completed',
          payment: {
            _id: payment._id,
            transactionRef: payment.transactionRef,
            amount: payment.amount,
            amountPaid: payosPaymentLink.amountPaid,
            status: payment.status,
          },
        };
      } else if (payosPaymentLink.status === 'CANCELLED') {
        payment.status = PaymentStatus.CANCELLED;
        await payment.save();

        return {
          success: false,
          message: 'Payment was cancelled',
          payment: {
            _id: payment._id,
            status: payment.status,
          },
        };
      }

      // Still pending or processing
      return {
        success: false,
        message: `Payment status: ${payosPaymentLink.status}`,
        payment: {
          _id: payment._id,
          status: payment.status,
          payosStatus: payosPaymentLink.status,
        },
      };
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to sync payment status';
      this.logger.error('Sync payment status error:', message);
      throw new BadRequestException(message);
    }
  }

  /**
   * Auto-sync tất cả pending payments từ PayOS
   * Chạy định kỳ bởi cronjob để kiểm tra các pending payments
   * Nếu PayOS báo đã PAID/COMPLETED, cập nhật DB
   */
  async syncAllPendingPayments() {
    try {
      this.logger.debug('Auto-syncing all pending payments from PayOS...');

      // Tìm tất cả pending payments
      const pendingPayments = await this.paymentModel.find({
        status: PaymentStatus.PENDING,
      });

      if (pendingPayments.length === 0) {
        this.logger.debug('No pending payments to sync');
        return;
      }

      this.logger.debug(
        `Found ${pendingPayments.length} pending payments to sync`,
      );

      for (const payment of pendingPayments) {
        try {
          // Extract orderCode từ transactionRef (AI1774271389 -> 1774271389)
          const orderCode = parseInt(
            payment.transactionRef.replace('AI', ''),
            10,
          );

          // Get payment status từ PayOS
          const payosPaymentLink =
            await this.payosService.getPaymentLink(orderCode);

          // Nếu đã PAID/COMPLETED, update DB
          if (
            payosPaymentLink.status === 'COMPLETED' ||
            payosPaymentLink.status === 'PAID'
          ) {
            payment.status = PaymentStatus.COMPLETED;
            payment.amountPaid = payosPaymentLink.amountPaid;
            await payment.save();
          } else if (payosPaymentLink.status === 'CANCELLED') {
            payment.status = PaymentStatus.CANCELLED;
            await payment.save();
          }
        } catch (error) {
          this.logger.warn(
            `Failed to sync payment ${payment.transactionRef}:`,
            error instanceof Error ? error.message : String(error),
          );
          // Continue with next payment, không throw
        }
      }
    } catch (error) {
      this.logger.error('Auto-sync all pending payments failed:', error);
    }
  }
}
