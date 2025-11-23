// mail.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter;
  private readonly logger = new Logger(MailService.name);

  constructor(private configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('MAIL_HOST'),
      port: this.configService.get<number>('MAIL_PORT'),
      secure: false,
      auth: {
        user: this.configService.get<string>('MAIL_USER'),
        pass: this.configService.get<string>('MAIL_PASSWORD'),
      },
    });
  }

  async sendOtpEmail(email: string, otp: string): Promise<void> {
    try {
      const mailOptions = {
        from: `ClubVerse NoReply <${this.configService.get<string>('MAIL_FROM')}>`,
        to: email,
        subject: 'Verify Your Account - OTP Code',
        html: `
          <div style="font-family: 'Roboto', Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto; background-color: #f9f9f9; border: 1px solid #ddd; border-radius: 8px;">
            <!-- Header với logo từ assets (URL public từ serve-static) -->
            <div style="text-align: center; margin-bottom: 20px;">
              <h2 style="color: #014eacff; margin: 0;">Email Verification</h2>
            </div>
            
            <p style="font-size: 16px; color: #333; margin-bottom: 20px;">Thank you for registering with ClubVerse. Your OTP code is:</p>
            
            <div style="background-color: #a0d0f7ff; padding: 15px; text-align: center; font-size: 28px; font-weight: bold; letter-spacing: 10px; margin: 20px 0; border-radius: 8px;">
              ${otp}
            </div>
            
            <p style="color: #800101ff; font-size: 17px; font-weight: bold; text-align: center; margin-bottom: 20px;">This OTP will expire in 5 minutes.</p>
            
            <p style="color: #249a00ff; font-size: 15px; text-align: center; margin-bottom: 30px;">If you didn't request this, please ignore this email.</p>
            
            <div style="text-align: center; font-size: 12px; color: #666; border-top: 1px solid #ddd; padding-top: 10px;">
              <p>Need help? Contact ADMIN <a href="mailto: minhuhoang4104@gmail.com" style="color: #014eacff; text-decoration: none;">minhvuhoang4104@gmail.com</a></p>
              <p>&copy; 2025 ClubVerse. All rights reserved.</p>
            </div>
          </div>
        `,
      };

      await this.transporter.sendMail(mailOptions);
      this.logger.log(`OTP email sent successfully to ${email}`);
    } catch (error) {
      this.logger.error(`Failed to send OTP email to ${email}`, error);
      throw new Error('Failed to send verification email');
    }
  }
}
