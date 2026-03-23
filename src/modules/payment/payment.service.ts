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
      const payosPaymentLink =
        await this.payosService.getPaymentLink(orderCode);

      this.logger.debug('PayOS payment status:', {
        orderCode,
        payosStatus: payosPaymentLink.status,
      });

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
      if (payosPaymentLink.status === 'COMPLETED') {
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
}
