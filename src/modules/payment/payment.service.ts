import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { Payment, PaymentStatus } from './schemas/payment.schema';
import { SepayService } from './sepay.service';
import { CreatePaymentDto } from './dto/create-payment.dto';

@Injectable()
export class PaymentService {
  constructor(
    @InjectModel('Payment') private paymentModel: Model<Payment>,
    private configService: ConfigService,
    private sepayService: SepayService,
  ) {}

  /**
   * Tạo đơn thanh toán mới
   */
  async createPayment(
    userId: string,
    createPaymentDto: CreatePaymentDto,
  ): Promise<{
    _id: string;
    transactionRef: string;
    amount: number;
    description: string;
    paymentInfo: {
      accountNumber: string;
      bankName: string;
      instructions: string;
    };
  }> {
    // Tạo transaction reference duy nhất
    const transactionRef =
      'AI' + Date.now() + Math.random().toString(36).substring(7);

    // Tạo payment object
    const payment = new this.paymentModel({
      userId: new Types.ObjectId(userId),
      amount: createPaymentDto.amount,
      description: createPaymentDto.description,
      packageType: createPaymentDto.packageType,
      transactionRef,
      status: PaymentStatus.PENDING,
    });

    await payment.save();

    // Tạo yêu cầu thanh toán từ Sepay
    const paymentRequest = this.sepayService.createPaymentRequest(
      createPaymentDto.amount,
      transactionRef,
      createPaymentDto.description,
    );

    payment.paymentUrl = `Bank Transfer: ${paymentRequest.accountNumber}`;
    await payment.save();

    return {
      _id: payment._id.toString(),
      transactionRef,
      amount: createPaymentDto.amount,
      description: createPaymentDto.description,
      paymentInfo: {
        accountNumber: paymentRequest.accountNumber,
        bankName: paymentRequest.bankName,
        instructions: paymentRequest.instructions,
      },
    };
  }

  /**
   * Xử lý callback từ Sepay
   */
  async handleSepayCallback(query: Record<string, string | string[]>) {
    console.log('[PaymentService] Received Sepay callback:', query);

    const verify = this.sepayService.verifyCallback(query);
    console.log('[PaymentService] Verified callback data:', verify);

    if (!verify.isValid) {
      return {
        success: false,
        message: 'Invalid payment data',
        received: query,
      };
    }

    // Tìm payment bằng transactionRef
    const payment = await this.paymentModel.findOne({
      transactionRef: verify.transactionRef,
    });

    console.log('[PaymentService] Found payment:', payment);

    if (!payment) {
      return {
        success: false,
        message: 'Payment not found',
        transactionRef: verify.transactionRef,
      };
    }

    // Verify amount
    if (payment.amount !== verify.amount) {
      console.log('[PaymentService] Amount mismatch:', {
        dbAmount: payment.amount,
        verifyAmount: verify.amount,
      });
      return {
        success: false,
        message: 'Amount mismatch',
        dbAmount: payment.amount,
        verifyAmount: verify.amount,
      };
    }

    // Update payment status dựa trên Sepay status
    // status: 1 = success (webhook chỉ gửi khi giao dịch xác nhận)
    if (verify.status === '1') {
      payment.status = PaymentStatus.COMPLETED;
    } else {
      payment.status = PaymentStatus.PENDING;
    }

    payment.responseCode = verify.status;

    await payment.save();

    console.log('[PaymentService] Payment updated:', {
      transactionRef: payment.transactionRef,
      status: payment.status,
    });

    return {
      success: verify.status === '1',
      message: verify.status === '1' ? 'Payment successful' : 'Payment pending',
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
}
