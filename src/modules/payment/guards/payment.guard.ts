import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Request } from 'express';
import { PaymentService } from '../payment.service';

interface AuthenticatedUser {
  sub: string;
  [key: string]: any;
}

@Injectable()
export class PaymentGuard implements CanActivate {
  constructor(private paymentService: PaymentService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user as unknown as AuthenticatedUser;

    if (!user || !user.sub) {
      throw new ForbiddenException('User not authenticated');
    }

    const hasPaid = await this.paymentService.hasUserPaid(user.sub);

    if (!hasPaid) {
      throw new ForbiddenException(
        'User must pay to access AI recommendation feature',
      );
    }

    return true;
  }
}
