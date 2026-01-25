import axios from 'axios';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface SepayConfig {
  apiKey: string;
  apiUrl: string;
  accountNumber?: string; // Số tài khoản ngân hàng để nhận tiền
}

export interface SepayPaymentRequest {
  transactionRef: string;
  amount: number;
  accountNumber: string;
  description: string;
  bankName: string;
  instructions: string;
}

export interface SepayTransaction {
  id: string;
  account_number: string;
  amount_in: string;
  transaction_content: string;
  reference_number: string;
}

@Injectable()
export class SepayService {
  private config: SepayConfig;

  constructor(private configService: ConfigService) {
    this.config = {
      apiKey: configService.get<string>('SEPAY_API_KEY') ?? '',
      apiUrl: configService.get<string>(
        'SEPAY_API_URL',
        'https://my.sepay.vn/userapi',
      ),
      accountNumber: configService.get<string>('SEPAY_ACCOUNT_NUMBER'),
    };
  }

  /**
   * Tạo yêu cầu thanh toán (tạo reference + số tài khoản nhận tiền)
   * Thay vì tạo payment link, trả về thông tin chuyển khoản
   */
  createPaymentRequest(
    amount: number,
    transactionRef: string,
    description: string,
  ): SepayPaymentRequest {
    // Sepay không cung cấp API tạo payment link
    // Thay vào đó, ta tạo yêu cầu thanh toán với thông tin ngân hàng
    // Sepay sẽ theo dõi các giao dịch đến

    if (!this.config.accountNumber) {
      throw new Error(
        'Bank account number not configured. Set SEPAY_ACCOUNT_NUMBER in .env',
      );
    }

    const paymentInfo: SepayPaymentRequest = {
      transactionRef,
      amount,
      accountNumber: this.config.accountNumber,
      description,
      bankName: 'Vietcombank',
      instructions: `Vui lòng chuyển tiền đến tài khoản:\n${this.config.accountNumber}\n\nSố tiền: ${amount.toLocaleString('vi-VN')} VND\n\nNội dung: ${transactionRef}`,
    };

    console.log('[Sepay] Payment request created:', paymentInfo);
    return paymentInfo;
  }

  /**
   * Kiểm tra giao dịch từ Sepay
   */
  async checkTransaction(
    transactionRef: string,
    amount: number,
  ): Promise<SepayTransaction | null> {
    try {
      console.log('[Sepay] Checking transaction:', {
        transactionRef,
        amount,
      });

      // Lấy danh sách giao dịch gần đây
      const listUrl = `${this.config.apiUrl}/transactions/list?limit=100`;
      const response = await axios.get(listUrl, {
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      });

      console.log('[Sepay] Transaction list response:', response.data);

      const responseData = response.data as {
        messages?: { success: boolean };
        transactions?: SepayTransaction[];
      };

      if (responseData.messages?.success && responseData.transactions) {
        const transactions: SepayTransaction[] = responseData.transactions;

        // Tìm giao dịch khớp với reference + amount
        const matchedTx = transactions.find(
          (tx) =>
            tx.reference_number === transactionRef &&
            parseFloat(tx.amount_in) === amount,
        );

        if (matchedTx) {
          console.log('[Sepay] Transaction found:', matchedTx);
          return matchedTx;
        }
      }

      return null;
    } catch (error: unknown) {
      let errorMessage = 'Unknown error';

      if (axios.isAxiosError(error)) {
        const statusCode = error.response?.status || 0;

        if (statusCode === 401) {
          errorMessage = `Sepay authentication failed (401). Check your SEPAY_API_KEY in .env`;
        } else if (statusCode === 403) {
          const responseData = error.response?.data as Record<string, unknown>;
          const serverMessage =
            typeof responseData?.error === 'string'
              ? responseData.error
              : JSON.stringify(responseData);
          errorMessage = `Sepay API access denied (403). ${serverMessage}`;
        } else {
          errorMessage = `[${statusCode}] ${error.message}`;
        }

        console.error('[Sepay Error]', {
          status: statusCode,
          message: errorMessage,
          data: error.response?.data as unknown,
        });
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }

      throw new Error('Sepay API Error: ' + errorMessage);
    }
  }

  /**
   * Verify callback từ Sepay webhook
   */
  verifyCallback(query: Record<string, string | string[]>): {
    isValid: boolean;
    transactionRef?: string;
    amount?: number;
    status?: string;
  } {
    // Sepay callback parameters:
    // transaction_id: ID giao dịch
    // amount: số tiền
    // reference_number: mã tham chiếu

    const referenceNumber = query.reference_number as string;
    const amount = query.amount ? parseInt(String(query.amount)) : 0;

    return {
      isValid: !!referenceNumber && amount > 0,
      transactionRef: referenceNumber,
      amount: amount,
      status: '1', // Sepay chỉ gửi webhook khi giao dịch đã xác nhận
    };
  }
}
