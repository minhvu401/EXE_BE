// approval.utils.ts
import * as crypto from 'crypto';

export class ApprovalUtils {
  static generateApprovalToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  static verifyApprovalToken(token: string): boolean {
    // Token hợp lệ nếu là string hex 64 ký tự
    return /^[a-f0-9]{64}$/.test(token);
  }
}
