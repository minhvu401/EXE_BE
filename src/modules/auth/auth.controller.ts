// auth.controller.ts
import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { ResendOtpDto } from './dto/resend-otp.dto';
import { LoginDto } from './dto/login.dto';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @ApiOperation({ summary: 'Đăng nhập người dùng' })
  @ApiResponse({
    status: 201,
    description: 'Đăng nhập thành công, trả về JWT token',
  })
  @ApiResponse({ status: 401, description: 'Thông tin đăng nhập không hợp lệ' })
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post('register')
  @ApiOperation({ summary: 'Đăng kí người dùng mới' })
  @ApiResponse({
    status: 201,
    description:
      'Đăng kí thành công, vui lòng kiểm tra email để nhận OTP xác thực tài khoản',
  })
  @ApiResponse({ status: 409, description: 'Email đã tồn tại' })
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('verify-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Xác thực tài khoản' })
  @ApiResponse({
    status: 200,
    description: 'Xác thực thành công, vui lòng đăng nhập để tiếp tục',
  })
  @ApiResponse({ status: 400, description: 'OTP không hợp lệ hoặc đã hết hạn' })
  async verifyOtp(@Body() verifyOtpDto: VerifyOtpDto) {
    return this.authService.verifyOtp(verifyOtpDto);
  }

  @Post('resend-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Gửi OTP lại' })
  @ApiResponse({
    status: 200,
    description: 'OTP đã được gửi lại qua email của bạn',
  })
  @ApiResponse({
    status: 400,
    description: 'Không tìm thấy người dùng hoặc tài khoản đã được xác thực',
  })
  async resendOtp(@Body() resendOtpDto: ResendOtpDto) {
    return this.authService.resendOtp(resendOtpDto);
  }
}
