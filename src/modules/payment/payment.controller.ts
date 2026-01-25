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
} from '@nestjs/common';
import type { Request } from 'express';
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
  constructor(private readonly paymentService: PaymentService) {}

  @Post('/create')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Tạo đơn thanh toán mới',
    description:
      'Tạo đơn thanh toán Sepay để sử dụng tính năng AI recommendation',
  })
  @ApiResponse({
    status: 201,
    description: 'Payment created successfully',
    schema: {
      example: {
        _id: '507f1f77bcf86cd799439011',
        transactionRef: 'AI1234567890abc',
        amount: 50000,
        description: 'Thanh toán gói AI Premium',
        paymentUrl: 'https://sepay.vn/payment/...',
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @HttpCode(HttpStatus.CREATED)
  async createPayment(
    @Body() createPaymentDto: CreatePaymentDto,
    @CurrentUser() user: { sub: string },
  ) {
    try {
      return await this.paymentService.createPayment(
        user.sub,
        createPaymentDto,
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Payment creation failed';
      throw new BadRequestException(message);
    }
  }

  @Get('/sepay-callback')
  @ApiOperation({
    summary: 'Sepay callback endpoint',
    description: 'Nhận kết quả thanh toán từ Sepay',
  })
  @ApiResponse({
    status: 200,
    description: 'Callback processed',
  })
  @HttpCode(HttpStatus.OK)
  async sepayCallback(@Query() query: Record<string, string | string[]>) {
    return this.paymentService.handleSepayCallback(query);
  }

  @Get('/test-callback')
  @ApiOperation({
    summary: '[TEST ONLY] Simulate Sepay callback for testing',
    description:
      'Để test: /payments/test-callback?reference_number=AI123&amount=50000',
  })
  @ApiResponse({
    status: 200,
    description: 'Test callback processed',
  })
  @HttpCode(HttpStatus.OK)
  async testCallback(@Query() query: Record<string, string | string[]>) {
    console.log('[TEST] Simulating Sepay callback with:', query);
    return this.paymentService.handleSepayCallback(query);
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

  @Get('/check-status')
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
