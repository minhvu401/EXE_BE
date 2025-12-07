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
  async sendApplicationSubmittedEmail(
    email: string,
    studentName: string,
    clubName: string,
  ): Promise<void> {
    try {
      const mailOptions = {
        from: `ClubVerse NoReply <${this.configService.get<string>('MAIL_FROM')}>`,
        to: email,
        subject: 'Đơn đăng ký của bạn đã được gửi thành công',
        html: `
          <div style="font-family: 'Roboto', Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto; background-color: #f9f9f9; border: 1px solid #ddd; border-radius: 8px;">
            <div style="text-align: center; margin-bottom: 20px;">
              <h2 style="color: #014eacff; margin: 0;">Nộp Đơn Đăng Ký Thành Công</h2>
            </div>
            <p style="font-size: 16px; color: #333;">Xin chào <strong>${studentName}</strong>,</p>
            <p style="font-size: 16px; color: #333; margin-bottom: 20px;">
              Đơn đăng ký của bạn vào câu lạc bộ <strong style="color: #014eacff; font-weight: bold">${clubName}</strong> đã được gửi thành công!
            </p>
            <p style="font-size: 15px; color: #666;">
              Câu lạc bộ sẽ xem xét hồ sơ của bạn và thông báo kết quả sớm nhất. Vui lòng kiểm tra email thường xuyên.
            </p>
            <div style="text-align: center; margin: 30px 0;">
              <div style="background-color: #039c0dff; padding: 15px; border-radius: 8px;">
                <p style="margin: 0; font-size: 14px; color: #333;">✅ Trạng thái: <strong>Đang chờ xét duyệt</strong></p>
              </div>
            </div>
            <div style="text-align: center; font-size: 12px; color: #666; border-top: 1px solid #ddd; padding-top: 10px; margin-top: 30px;">
              <p>Cần hỗ trợ? Liên hệ <a href="mailto:minhvuhoang4104@gmail.com" style="color: #014eacff; text-decoration: none;">minhvuhoang4104@gmail.com</a></p>
              <p>&copy; 2025 ClubVerse. All rights reserved.</p>
            </div>
          </div>
        `,
      };

      await this.transporter.sendMail(mailOptions);
      this.logger.log(`Application submitted email sent to ${email}`);
    } catch (error) {
      this.logger.error(
        `Failed to send application submitted email to ${email}`,
        error,
      );
    }
  }

  async sendInterviewScheduleEmail(
    email: string,
    studentName: string,
    clubName: string,
    interviewDate: Date,
    location?: string,
    note?: string,
  ): Promise<void> {
    try {
      const formattedDate = new Date(interviewDate).toLocaleString('vi-VN', {
        dateStyle: 'full',
        timeStyle: 'short',
      });

      const mailOptions = {
        from: `ClubVerse NoReply <${this.configService.get<string>('MAIL_FROM')}>`,
        to: email,
        subject: `🎉 Chúc mừng! Lịch phỏng vấn từ ${clubName}`,
        html: `
          <div style="font-family: 'Roboto', Arial, sans-serif; padding: 30px; max-width: 600px; margin: 0 auto; background-color: #F8FAFC; border: 1px solid #E5E7EB; border-radius: 12px;">
            <div style="text-align: center; margin-bottom: 30px; background: linear-gradient(to right, #001F3F, #4A90E2); padding: 20px; border-radius: 8px 8px 0 0; color: #FFFFFF;">
              <h2 style="margin: 0; font-size: 24px;">🎉 Chúc Mừng!</h2>
            </div>
            <p style="font-size: 16px; color: #001F3F; line-height: 1.5;">Xin chào <strong>${studentName}</strong>,</p>
            <p style="font-size: 16px; color: #001F3F; margin-bottom: 25px; line-height: 1.5;">
              Đơn đăng ký của bạn vào câu lạc bộ <strong style="color: #4A90E2; font-weight: bold;">${clubName}</strong> đã được chấp nhận!
            </p>
            
            <div style="background-color: #FFFFFF; padding: 25px; border-radius: 8px; border-left: 4px solid #4A90E2; margin: 25px 0; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
              <h3 style="color: #4A90E2; margin-top: 0; font-size: 20px;">📅 Thông Tin Phỏng Vấn</h3>
              <p style="margin: 12px 0; color: #001F3F;"><strong>Thời gian:</strong> ${formattedDate}</p>
              ${location ? `<p style="margin: 12px 0; color: #001F3F;"><strong>Địa điểm:</strong> ${location}</p>` : ''}
              ${note ? `<p style="margin: 12px 0; color: #001F3F;"><strong>Ghi chú:</strong> ${note}</p>` : ''}
            </div>

            <div style="background-color: #FFF8E1; padding: 18px; border-radius: 8px; border-left: 4px solid #FFD700; margin: 25px 0; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
              <p style="margin: 0; font-size: 14px; color: #856404; line-height: 1.4;">
                ⚠️ <strong>Lưu ý:</strong> Vui lòng có mặt đúng giờ và chuẩn bị đầy đủ tài liệu cần thiết.
              </p>
            </div>

            <p style="font-size: 15px; color: #6B7280; text-align: center; margin-top: 35px; line-height: 1.5;">
              Chúc bạn may mắn! 🍀
            </p>

            <div style="text-align: center; font-size: 12px; color: #6B7280; border-top: 1px solid #E5E7EB; padding-top: 15px; margin-top: 35px;">
              <p>Cần hỗ trợ? Liên hệ <a href="mailto:minhvuhoang4104@gmail.com" style="color: #4A90E2; text-decoration: none; font-weight: bold;">minhvuhoang4104@gmail.com</a></p>
              <p>&copy; 2025 ClubVerse. All rights reserved.</p>
            </div>
          </div>
        `,
      };

      await this.transporter.sendMail(mailOptions);
      this.logger.log(`Interview schedule email sent to ${email}`);
    } catch (error) {
      this.logger.error(
        `Failed to send interview schedule email to ${email}`,
        error,
      );
    }
  }

  async sendApplicationRejectedEmail(
    email: string,
    studentName: string,
    clubName: string,
    reason?: string,
  ): Promise<void> {
    try {
      const mailOptions = {
        from: `ClubVerse NoReply <${this.configService.get<string>('MAIL_FROM')}>`,
        to: email,
        subject: `Thông báo về đơn đăng ký vào ${clubName}`,
        html: `
          <div style="font-family: 'Roboto', Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto; background-color: #f9f9f9; border: 1px solid #ddd; border-radius: 8px;">
            <div style="text-align: center; margin-bottom: 20px;">
              <h2 style="color: #800101ff; margin: 0;">Thông Báo Đơn Đăng Ký</h2>
            </div>
            <p style="font-size: 16px; color: #333;">Xin chào <strong>${studentName}</strong>,</p>
            <p style="font-size: 16px; color: #333; margin-bottom: 20px;">
              Cảm ơn bạn đã quan tâm đến câu lạc bộ <strong style="color: #014eacff;">${clubName}</strong>.
            </p>
            
            <div style="background-color: #fff; padding: 20px; border-radius: 8px; border-left: 4px solid #800101ff; margin: 20px 0;">
              <p style="margin: 0; font-size: 15px; color: #333;">
                Rất tiếc, đơn đăng ký của bạn chưa được chấp nhận lúc này.
              </p>
              ${reason ? `<p style="margin: 15px 0 0 0; font-size: 14px; color: #666;"><strong>Lý do:</strong> ${reason}</p>` : ''}
            </div>

            <p style="font-size: 15px; color: #666; text-align: center; margin-top: 30px;">
              Đừng nản lòng! Bạn có thể tìm hiểu các câu lạc bộ khác hoặc nâng cao kỹ năng để đăng ký lại trong tương lai.
            </p>

            <div style="text-align: center; font-size: 12px; color: #666; border-top: 1px solid #ddd; padding-top: 10px; margin-top: 30px;">
              <p>Cần hỗ trợ? Liên hệ <a href="mailto:minhvuhoang4104@gmail.com" style="color: #014eacff; text-decoration: none;">minhvuhoang4104@gmail.com</a></p>
              <p>&copy; 2025 ClubVerse. All rights reserved.</p>
            </div>
          </div>
        `,
      };

      await this.transporter.sendMail(mailOptions);
      this.logger.log(`Application rejected email sent to ${email}`);
    } catch (error) {
      this.logger.error(
        `Failed to send application rejected email to ${email}`,
        error,
      );
    }
  }

  async sendFinalDecisionEmail(
    email: string,
    studentName: string,
    clubName: string,
    isAccepted: boolean,
    reason?: string,
  ): Promise<void> {
    try {
      const mailOptions = {
        from: `ClubVerse NoReply <${this.configService.get<string>('MAIL_FROM')}>`,
        to: email,
        subject: isAccepted
          ? `🎊 Chúc mừng! Bạn đã trở thành thành viên của ${clubName}`
          : `Kết quả phỏng vấn từ ${clubName}`,
        html: isAccepted
          ? `
          <div style="font-family: 'Roboto', Arial, sans-serif; padding: 30px; max-width: 600px; margin: 0 auto; background-color: #F8FAFC; border: 1px solid #E5E7EB; border-radius: 12px;">
            <div style="text-align: center; margin-bottom: 30px; background: linear-gradient(to right, #001F3F, #4A90E2); padding: 20px; border-radius: 8px 8px 0 0; color: #FFFFFF;">
              <h2 style="margin: 0; font-size: 24px;">🎊 Chúc Mừng!</h2>
            </div>
            <p style="font-size: 16px; color: #001F3F; line-height: 1.5;">Xin chào <strong>${studentName}</strong>,</p>
            <p style="font-size: 16px; color: #001F3F; margin-bottom: 25px; line-height: 1.5;">
              Sau buổi phỏng vấn, chúng tôi rất vui mừng thông báo rằng bạn đã chính thức trở thành thành viên của 
              <strong style="color: #4A90E2;">${clubName}</strong>! 🎉
            </p>
            
            <div style="background-color: #FFFFFF; padding: 25px; border-radius: 8px; border-left: 4px solid #4A90E2; margin: 25px 0; box-shadow: 0 4px 6px rgba(0,0,0,0.05); text-align: center;">
              <h3 style="color: #4A90E2; margin: 0; font-size: 20px;">✅ Bạn đã được chấp nhận!</h3>
            </div>

            <p style="font-size: 15px; color: #6B7280; line-height: 1.5; justify-content: center; text-align: center;">
              Hãy tham gia các hoạt động của câu lạc bộ và tận hưởng những trải nghiệm tuyệt vời!
            </p>

            <div style="text-align: center; margin: 35px 0;">
              <p style="font-size: 18px; margin: 0;">Chào mừng bạn đến với câu lạc bộ 🤝</p>
            </div>

            <div style="text-align: center; font-size: 12px; color: #6B7280; border-top: 1px solid #E5E7EB; padding-top: 15px; margin-top: 35px;">
              <p>Cần hỗ trợ? Liên hệ <a href="mailto:minhvuhoang4104@gmail.com" style="color: #4A90E2; text-decoration: none; font-weight: bold;">minhvuhoang4104@gmail.com</a></p>
              <p>&copy; 2025 ClubVerse. All rights reserved.</p>
            </div>
          </div>
        `
          : `
          <div style="font-family: 'Roboto', Arial, sans-serif; padding: 30px; max-width: 600px; margin: 0 auto; background-color: #F8FAFC; border: 1px solid #E5E7EB; border-radius: 12px;">
            <div style="text-align: center; margin-bottom: 30px; background: linear-gradient(to right, #001F3F, #4A90E2); padding: 20px; border-radius: 8px 8px 0 0; color: #FFFFFF;">
              <h2 style="margin: 0; font-size: 24px;">Kết Quả Phỏng Vấn</h2>
            </div>
            <p style="font-size: 16px; color: #001F3F; line-height: 1.5;">Xin chào <strong>${studentName}</strong>,</p>
            <p style="font-size: 16px; color: #001F3F; margin-bottom: 25px; line-height: 1.5;">
              Cảm ơn bạn đã tham gia phỏng vấn tại câu lạc bộ <strong style="color: #4A90E2;">${clubName}</strong>.
            </p>
            
            <div style="background-color: #FFFFFF; padding: 25px; border-radius: 8px; border-left: 4px solid #DC2626; margin: 25px 0; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
              <p style="margin: 0; font-size: 15px; color: #B91C1C; line-height: 1.4;">
                Rất tiếc, sau buổi phỏng vấn, chúng tôi nhận thấy bạn chưa phù hợp với vị trí này lúc này.
              </p>
              ${reason ? `<p style="margin: 15px 0 0 0; font-size: 14px; color: #B91C1C; line-height: 1.4;"><strong>Lý do:</strong> ${reason}</p>` : ''}
            </div>

            <p style="font-size: 15px; color: #6B7280; text-align: center; margin-top: 35px; line-height: 1.5;">
              Đừng nản lòng! Hãy tiếp tục nỗ lực và phát triển bản thân. Chúc bạn thành công trong tương lai! 💪
            </p>

            <div style="text-align: center; font-size: 12px; color: #6B7280; border-top: 1px solid #E5E7EB; padding-top: 15px; margin-top: 35px;">
              <p>Cần hỗ trợ? Liên hệ <a href="mailto:minhvuhoang4104@gmail.com" style="color: #4A90E2; text-decoration: none; font-weight: bold;">minhvuhoang4104@gmail.com</a></p>
              <p>&copy; 2025 ClubVerse. All rights reserved.</p>
            </div>
          </div>
        `,
      };

      await this.transporter.sendMail(mailOptions);
      this.logger.log(`Final decision email sent to ${email}`);
    } catch (error) {
      this.logger.error(
        `Failed to send final decision email to ${email}`,
        error,
      );
    }
  }
}
