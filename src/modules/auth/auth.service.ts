// auth.service.ts
import {
  Injectable,
  BadRequestException,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { User } from './schemas/user.schema';
import { Otp } from './schemas/otp.schema';
import { Model } from 'mongoose';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { RegisterDto } from './dto/register.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { ResendOtpDto } from './dto/resend-otp.dto';
import { MailService } from '../mail/mail.service';
import { LoginDto } from './dto/login.dto';
import { UserPayload } from './interface/user-payload.interface';
@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(Otp.name) private otpModel: Model<Otp>,
    private jwtService: JwtService,
    private configService: ConfigService,
    private mailService: MailService,
  ) {}

  // Generate 6-digit OTP
  private generateOtp(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  // Create and save OTP
  private async createOtp(email: string): Promise<string> {
    const otp = this.generateOtp();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // Delete old OTPs for this email
    await this.otpModel.deleteMany({ email });

    // Create new OTP
    await this.otpModel.create({
      email,
      otp,
      expiresAt,
    });

    return otp;
  }

  async register(registerDto: RegisterDto): Promise<{ message: string }> {
    const { email, password, ...userData } = registerDto;

    // Check if user already exists
    const existingUser = await this.userModel.findOne({ email });
    if (existingUser) {
      if (existingUser.isVerified) {
        throw new ConflictException('Email đã được đăng kí và xác thực');
      }
      // If user exists but not verified, allow re-registration
      await this.userModel.deleteOne({ email });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user (not verified yet)
    await this.userModel.create({
      email,
      password: hashedPassword,
      isVerified: false,
      isActive: false, // Only activate after verification
      ...userData,
    });

    // Generate and send OTP
    const otp = await this.createOtp(email);
    await this.mailService.sendOtpEmail(email, otp);

    return {
      message:
        'Đăng kí thành công, vui lòng kiểm tra email để nhận OTP xác thực tài khoản',
    };
  }

  async verifyOtp(verifyOtpDto: VerifyOtpDto): Promise<{ message: any }> {
    const { email, otp } = verifyOtpDto;

    // Find OTP
    const otpRecord = await this.otpModel.findOne({
      email,
      otp,
      isUsed: false,
    });

    if (!otpRecord) {
      throw new BadRequestException('OTP không hợp lệ hoặc đã được sử dụng');
    }

    // Check if OTP is expired
    if (otpRecord.expiresAt < new Date()) {
      await this.otpModel.deleteOne({ _id: otpRecord._id });
      throw new BadRequestException('OTP đã hết hạn');
    }

    // Find user
    const user = await this.userModel.findOne({ email });
    if (!user) {
      throw new BadRequestException('Không tìm thấy người dùng');
    }

    // Update user as verified
    user.isVerified = true;
    user.isActive = true;
    await user.save();

    // Mark OTP as used
    otpRecord.isUsed = true;
    await otpRecord.save();

    return {
      message: 'Xác nhận thành công, vui lòng đăng nhập để tiếp tục',
    };
  }

  async resendOtp(resendOtpDto: ResendOtpDto): Promise<{ message: string }> {
    const { email } = resendOtpDto;

    // Check if user exists
    const user = await this.userModel.findOne({ email });
    if (!user) {
      throw new BadRequestException('Không tìm thấy người dùng');
    }

    if (user.isVerified) {
      throw new BadRequestException('Người dùng đã được xác thực');
    }

    // Generate and send new OTP
    const otp = await this.createOtp(email);
    await this.mailService.sendOtpEmail(email, otp);

    return {
      message: 'OTP đã được gửi lại qua email của bạn',
    };
  }

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    const user = await this.userModel.findOne({ email });
    if (!user) {
      throw new UnauthorizedException('Không tìm thấy người dùng');
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      throw new UnauthorizedException('Thông tin đăng nhập không hợp lệ');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Người dùng đã bị vô hiệu hóa');
    }

    const payload: UserPayload = {
      sub: user._id.toString(),
      role: user.role,
    };
    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      user: {
        id: user._id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
      },
    };
  }
}
