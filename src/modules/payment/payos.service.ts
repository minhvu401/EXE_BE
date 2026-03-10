/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

export interface PayOSConfig {
  clientId: string;
  apiKey: string;
  checksumKey: string;
  apiUrl: string;
}

export interface PayOSPaymentLinkRequest {
  orderCode: number;
  amount: number;
  description: string;
  returnUrl: string;
  cancelUrl: string;
  items: Array<{
    name: string;
    price: number;
    quantity: number;
  }>;
}

export interface PayOSPaymentLinkResponse {
  id: string;
  orderCode: number;
  amount: number;
  amountPaid: number;
  description: string;
  items: Array<{
    name: string;
    price: number;
    quantity: number;
  }>;
  checkoutUrl: string;
  qrCode: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'CANCELLED' | 'EXPIRED';
  createdAt: string;
  expiredAt: string;
  cancelledAt: string;
  cancelReason: string;
}

export interface WebhookData {
  orderCode: number;
  amount: number;
  description: string;
  accountNumber: string;
  reference: string;
  transactionDateTime: string;
  virtualAccountName: string;
  virtualAccountNumber: string;
  counterAccountBankId: string;
  counterAccountBankName: string;
  counterAccountName: string;
  counterAccountNumber: string;
  transferType: string;
  code: string;
  message: string;
  signature: string;
}

@Injectable()
export class PayOSService {
  private config: PayOSConfig;
  private logger = new Logger('PayOSService');

  constructor(private configService: ConfigService) {
    this.config = {
      clientId: configService.get<string>('PAYOS_CLIENT_ID') ?? '',
      apiKey: configService.get<string>('PAYOS_API_KEY') ?? '',
      checksumKey: configService.get<string>('PAYOS_CHECKSUM_KEY') ?? '',
      apiUrl: configService.get<string>(
        'PAYOS_API_URL',
        'https://api.payos.vn/v1',
      ),
    };

    if (
      !this.config.clientId ||
      !this.config.apiKey ||
      !this.config.checksumKey
    ) {
      this.logger.warn(
        'PayOS credentials not fully configured. Set PAYOS_CLIENT_ID, PAYOS_API_KEY, PAYOS_CHECKSUM_KEY in .env',
      );
    }
  }

  /**
   * Tạo payment link qua PayOS API
   */
  async createPaymentLink(
    request: PayOSPaymentLinkRequest,
  ): Promise<PayOSPaymentLinkResponse> {
    try {
      this.logger.debug('Creating payment link:', {
        orderCode: request.orderCode,
        amount: request.amount,
        description: request.description,
        returnUrl: request.returnUrl,
        cancelUrl: request.cancelUrl,
      });

      const url = `${this.config.apiUrl}/payment-requests`;

      const payload = {
        orderCode: request.orderCode,
        amount: request.amount,
        description: request.description,
        returnUrl: request.returnUrl,
        cancelUrl: request.cancelUrl,
        items: request.items,
        signature: this.generateSignature(request),
      };

      this.logger.debug('PayOS request payload:', {
        url,
        clientId: this.config.clientId,
        payload: {
          ...payload,
          signature: payload.signature.substring(0, 10) + '...',
        },
      });

      let response;
      try {
        response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-client-id': this.config.clientId,
            'x-api-key': this.config.apiKey,
          },
          body: JSON.stringify(payload),
        });
      } catch (fetchError) {
        const errorDetails: any = {
          message:
            fetchError instanceof Error
              ? fetchError.message
              : String(fetchError),
          url,
          headers: {
            'x-client-id': this.config.clientId,
          },
        };

        // Capture detailed error info
        if (fetchError instanceof Error) {
          errorDetails.name = fetchError.name;
          errorDetails.stack = fetchError.stack;
          if ('cause' in fetchError) {
            errorDetails.cause = fetchError.cause;
          }
        }

        this.logger.error('PayOS Fetch Error (Network):', errorDetails);
        throw new BadRequestException(
          `Network error connecting to PayOS: ${errorDetails.message}`,
        );
      }

      if (!response.ok) {
        const errorText = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { message: errorText };
        }
        const errorMessage = errorData.message || errorData.error || errorText;
        this.logger.error('PayOS API Error Response:', {
          status: response.status,
          statusText: response.statusText,
          body: errorData,
        });
        throw new Error(
          `PayOS API Error (${response.status}): ${errorMessage}`,
        );
      }

      const data = await response.json();
      this.logger.debug('Payment link created:', data);

      return data.data as PayOSPaymentLinkResponse;
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to create payment link';
      this.logger.error('Create payment link error:', message);
      throw new BadRequestException(message);
    }
  }

  /**
   * Verify webhook signature từ PayOS
   */
  verifyWebhookSignature(body: any): boolean {
    try {
      const { signature, ...data } = body;

      // Build signature string
      let signatureString = '';
      const keys = Object.keys(data).sort();
      keys.forEach((key) => {
        if (data[key] !== null && data[key] !== undefined && data[key] !== '') {
          signatureString += `${data[key]};`;
        }
      });

      // Remove trailing semicolon
      signatureString = signatureString.slice(0, -1);

      // Generate checksum
      const checksum = crypto
        .createHmac('sha256', this.config.checksumKey)
        .update(signatureString)
        .digest('hex');

      this.logger.debug('Webhook signature verification:', {
        received: signature,
        computed: checksum,
        signatureString,
      });

      return signature === checksum;
    } catch (error) {
      this.logger.error('Webhook signature verification error:', error);
      return false;
    }
  }

  /**
   * Parse webhook data
   */
  parseWebhookData(body: any): WebhookData | null {
    try {
      if (!this.verifyWebhookSignature(body)) {
        this.logger.warn('Invalid webhook signature');
        return null;
      }

      return {
        orderCode: body.orderCode,
        amount: body.amount,
        description: body.description,
        accountNumber: body.accountNumber,
        reference: body.reference,
        transactionDateTime: body.transactionDateTime,
        virtualAccountName: body.virtualAccountName,
        virtualAccountNumber: body.virtualAccountNumber,
        counterAccountBankId: body.counterAccountBankId,
        counterAccountBankName: body.counterAccountBankName,
        counterAccountName: body.counterAccountName,
        counterAccountNumber: body.counterAccountNumber,
        transferType: body.transferType,
        code: body.code,
        message: body.message,
        signature: body.signature,
      };
    } catch (error) {
      this.logger.error('Parse webhook data error:', error);
      return null;
    }
  }

  /**
   * Generate signature for payment request
   * Signature format: amount=X&cancelUrl=X&description=X&orderCode=X&returnUrl=X
   * Then HMAC_SHA256 with checksum key
   */
  private generateSignature(request: PayOSPaymentLinkRequest): string {
    // Build signature string with alphabetically sorted parameters
    const signatureString = `amount=${request.amount}&cancelUrl=${request.cancelUrl}&description=${request.description}&orderCode=${request.orderCode}&returnUrl=${request.returnUrl}`;

    const signature = crypto
      .createHmac('sha256', this.config.checksumKey)
      .update(signatureString)
      .digest('hex');

    this.logger.debug('Signature generation:', {
      signatureString,
      checksumKeyLength: this.config.checksumKey.length,
      generatedSignature: signature.substring(0, 20) + '...',
    });

    return signature;
  }

  /**
   * Get payment request details from PayOS
   */
  async getPaymentLink(orderCode: number): Promise<PayOSPaymentLinkResponse> {
    try {
      const url = `${this.config.apiUrl}/payment-requests/${orderCode}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'x-client-id': this.config.clientId,
          'x-api-key': this.config.apiKey,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { message: errorText };
        }
        const errorMessage = errorData.message || errorData.error || errorText;
        this.logger.error('PayOS API Error Response:', {
          status: response.status,
          statusText: response.statusText,
          body: errorData,
        });
        throw new Error(
          `PayOS API Error (${response.status}): ${errorMessage}`,
        );
      }

      const data = await response.json();
      return data.data as PayOSPaymentLinkResponse;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to get payment link';
      this.logger.error('Get payment link error:', message);
      throw new BadRequestException(message);
    }
  }

  /**
   * Cancel payment request
   */
  async cancelPaymentLink(
    orderCode: number,
  ): Promise<PayOSPaymentLinkResponse> {
    try {
      const url = `${this.config.apiUrl}/payment-requests/${orderCode}/cancel`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-client-id': this.config.clientId,
          'x-api-key': this.config.apiKey,
        },
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`PayOS API Error: ${errorData.message}`);
      }

      const data = await response.json();
      return data.data as PayOSPaymentLinkResponse;
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to cancel payment link';
      this.logger.error('Cancel payment link error:', message);
      throw new BadRequestException(message);
    }
  }
}
