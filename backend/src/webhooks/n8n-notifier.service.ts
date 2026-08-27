import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

const OUTBOUND_TIMEOUT_MS = 5000;

interface TicketCreatedPayload {
  ticketId: number;
  title: string;
  description: string;
}

/**
 * Dispara el webhook saliente a n8n cuando se crea un ticket. Es
 * "best-effort": si n8n no responde, está caído o da timeout, el error se
 * loguea pero nunca se propaga — el ticket ya quedó creado para el usuario
 * y simplemente se queda en enrichmentStatus "pending" (limitación conocida,
 * documentada en el README).
 */
@Injectable()
export class N8nNotifierService {
  private readonly logger = new Logger(N8nNotifierService.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  async notifyTicketCreated(payload: TicketCreatedPayload): Promise<boolean> {
    const url = this.configService.get<string>('N8N_WEBHOOK_URL');
    if (!url) {
      this.logger.warn(
        'N8N_WEBHOOK_URL no está configurada; se omite el webhook saliente.',
      );
      return false;
    }

    const secret = this.configService.get<string>('N8N_WEBHOOK_SECRET', '');

    try {
      const response = await firstValueFrom(
        this.httpService.post(url, payload, {
          headers: { 'X-Webhook-Secret': secret },
          timeout: OUTBOUND_TIMEOUT_MS,
        }),
      );
      return response.status >= 200 && response.status < 300;
    } catch (error) {
      this.logger.error(
        `No se pudo notificar a n8n para el ticket ${payload.ticketId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return false;
    }
  }
}
