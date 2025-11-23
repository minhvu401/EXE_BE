/* eslint-disable @typescript-eslint/no-unnecessary-type-assertion */
import { AuthGuard } from '@nestjs/passport';
import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { User } from '../schemas/user.schema';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  private readonly logger = new Logger(JwtAuthGuard.name);

  canActivate(context: ExecutionContext) {
    const request = context
      .switchToHttp()
      .getRequest() as import('express').Request;
    const authHeader = request.headers.authorization;

    if (authHeader) {
      this.logger.debug(`Auth header:...`);
    }

    return super.canActivate(context);
  }

  handleRequest<TUser = Omit<User, 'password'>>(
    err: Error | null,
    user: TUser | false,
    info: Error | undefined,
  ): TUser {
    if (err) {
      this.logger.error(`Authentication error: ${err.message}`, err.stack);
      throw err;
    }

    if (!user) {
      this.logger.warn(`No user found. Info message: ${info?.message}`);
      throw new UnauthorizedException(
        info?.message || 'Authentication failed - no user found',
      );
    }

    return user;
  }
}
