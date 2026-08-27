import {
  Injectable,
  UnauthorizedException,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';

const WEBHOOK_SECRET_HEADER = 'x-webhook-secret';

@Injectable()
export class WebhookSecretGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const provided = request.headers[WEBHOOK_SECRET_HEADER];
    const expected =
      this.configService.getOrThrow<string>('N8N_WEBHOOK_SECRET');

    if (!provided || provided !== expected) {
      throw new UnauthorizedException('Secreto de webhook inválido');
    }

    return true;
  }
}
