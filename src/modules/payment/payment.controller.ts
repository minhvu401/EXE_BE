import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Param,
  BadRequestException,
  Req,
  Inject,
} from '@nestjs/common';
import type { Request } from 'express';
import { ConfigService } from '@nestjs/config';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { PaymentService } from './payment.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { CurrentUser } from '../auth/decorators/currentUser.decorator';

@ApiTags('Payments')
@Controller('payments')
export class PaymentController {
  constructor(
    private readonly paymentService: PaymentService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Get base URL from request
   * Handles proxy headers for Render deployments
   */
  private getBaseUrl(request: Request): string {
    // First, try to get from environment APP_URL (most reliable)
    const appUrl = this.configService.get<string>('APP_URL');
    if (appUrl) {
      return appUrl;
    }

    // Fallback: Handle proxy headers (X-Forwarded-Proto, X-Forwarded-Host)
    const protocol = request.get('X-Forwarded-Proto') || request.protocol;
    const host = request.get('X-Forwarded-Host') || request.get('host');

    return `${protocol}://${host}`;
  }

  @Post('/create')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Tạo đơn thanh toán mới',
    description:
      'Tạo đơn thanh toán PayOS để sử dụng tính năng AI recommendation',
  })
  @ApiResponse({
    status: 201,
    description: 'Payment created successfully',
    schema: {
      example: {
        _id: '507f1f77bcf86cd799439011',
        orderCode: 1234567890,
        amount: 50000,
        description: 'Thanh toán gói AI Premium',
        checkoutUrl: 'https://payos.vn/payment/...',
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @HttpCode(HttpStatus.CREATED)
  async createPayment(
    @Body() createPaymentDto: CreatePaymentDto,
    @CurrentUser() user: { sub: string },
    @Req() request: Request,
  ) {
    try {
      const baseUrl = this.getBaseUrl(request);
      return await this.paymentService.createPayment(
        user.sub,
        createPaymentDto,
        baseUrl,
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Payment creation failed';
      throw new BadRequestException(message);
    }
  }

  @Post('/payos-webhook')
  @ApiOperation({
    summary: 'PayOS webhook endpoint',
    description: 'Nhận kết quả thanh toán từ PayOS',
  })
  @ApiResponse({
    status: 200,
    description: 'Webhook processed successfully',
  })
  @HttpCode(HttpStatus.OK)
  async payosWebhook(@Body() body: any) {
    return this.paymentService.handlePayOSWebhook(body);
  }

  @Get('/test-callback')
  @ApiOperation({
    summary: '[TEST ONLY] Simulate PayOS webhook for testing',
    description: 'Để test: POST /payments/test-callback với webhook body',
  })
  @ApiResponse({
    status: 200,
    description: 'Test callback processed',
  })
  @HttpCode(HttpStatus.OK)
  async testCallback(@Body() body: any) {
    console.log('[TEST] Simulating PayOS webhook with:', body);
    return this.paymentService.handlePayOSWebhook(body);
  }

  @Get('/history')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Lấy lịch sử thanh toán',
  })
  @HttpCode(HttpStatus.OK)
  async getPaymentHistory(@CurrentUser() user: { sub: string }) {
    return this.paymentService.getPaymentHistory(user.sub);
  }

  @Get('/detail/:transactionRef')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Lấy chi tiết một đơn thanh toán',
  })
  @HttpCode(HttpStatus.OK)
  async getPaymentDetail(@Param('transactionRef') transactionRef: string) {
    return this.paymentService.getPaymentDetail(transactionRef);
  }

  @Get('/status/:orderCode')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Kiểm tra trạng thái thanh toán',
  })
  @HttpCode(HttpStatus.OK)
  async getPaymentStatus(@Param('orderCode') orderCode: string) {
    return this.paymentService.getPaymentStatus(parseInt(orderCode, 10));
  }

  @Get('/check-paid')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Kiểm tra user đã thanh toán chưa',
    description: 'Trả về true nếu user đã thanh toán, false nếu chưa',
  })
  @HttpCode(HttpStatus.OK)
  async checkPaymentStatus(@CurrentUser() user: { sub: string }) {
    const hasPaid = await this.paymentService.hasUserPaid(user.sub);
    return {
      hasPaid,
      message: hasPaid
        ? 'User has paid for AI recommendation'
        : 'User needs to pay for AI recommendation',
    };
  }
}
