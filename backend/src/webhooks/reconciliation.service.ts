import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service.js';
import { N8nNotifierService } from './n8n-notifier.service.js';

const MAX_NOTIFY_ATTEMPTS = 3;
const RETRY_BACKOFF_MS = [60_000, 5 * 60_000, 15 * 60_000];
const PROCESSING_TIMEOUT_MS = 10 * 60_000;

/**
 * Cierra los dos huecos del flujo de enriquecimiento documentados en el
 * README: un ticket puede quedarse en "pending" para siempre si el POST
 * saliente a n8n falló, o en "processing" para siempre si n8n nunca llamó
 * de vuelta al callback. Corre cada minuto y reconcilia ambos casos sin
 * agregar infraestructura nueva (nada de colas/Redis).
 */
@Injectable()
export class ReconciliationService {
  private readonly logger = new Logger(ReconciliationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly n8nNotifier: N8nNotifierService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async handleCron() {
    await this.retryPendingTickets();
    await this.timeoutStaleProcessingTickets();
  }

  private isRetryDue(
    ticket: { notifyAttempts: number; lastNotifyAttemptAt: Date | null },
    now: Date,
  ): boolean {
    if (ticket.lastNotifyAttemptAt === null) {
      return true;
    }
    const backoffMs =
      RETRY_BACKOFF_MS[ticket.notifyAttempts] ??
      RETRY_BACKOFF_MS[RETRY_BACKOFF_MS.length - 1];
    return now.getTime() - ticket.lastNotifyAttemptAt.getTime() >= backoffMs;
  }

  async retryPendingTickets() {
    const now = new Date();

    const candidates = await this.prisma.ticket.findMany({
      where: {
        enrichmentStatus: 'pending',
        notifyAttempts: { lt: MAX_NOTIFY_ATTEMPTS },
      },
    });

    for (const ticket of candidates) {
      if (!this.isRetryDue(ticket, now)) {
        continue;
      }

      const notified = await this.n8nNotifier.notifyTicketCreated({
        ticketId: ticket.id,
        title: ticket.title,
        description: ticket.description,
      });
      const nextAttempts = ticket.notifyAttempts + 1;

      if (notified) {
        await this.prisma.ticket.update({
          where: { id: ticket.id },
          data: {
            enrichmentStatus: 'processing',
            notifyAttempts: nextAttempts,
            lastNotifyAttemptAt: now,
          },
        });
        continue;
      }

      if (nextAttempts >= MAX_NOTIFY_ATTEMPTS) {
        this.logger.warn(
          `Ticket ${ticket.id} agotó los ${MAX_NOTIFY_ATTEMPTS} reintentos de notificación a n8n; se marca como failed.`,
        );
        await this.prisma.ticket.update({
          where: { id: ticket.id },
          data: {
            enrichmentStatus: 'failed',
            notifyAttempts: nextAttempts,
            lastNotifyAttemptAt: now,
            enrichedAt: now,
          },
        });
        continue;
      }

      await this.prisma.ticket.update({
        where: { id: ticket.id },
        data: { notifyAttempts: nextAttempts, lastNotifyAttemptAt: now },
      });
    }
  }

  async timeoutStaleProcessingTickets() {
    const now = new Date();
    const threshold = new Date(now.getTime() - PROCESSING_TIMEOUT_MS);

    const { count } = await this.prisma.ticket.updateMany({
      where: { enrichmentStatus: 'processing', updatedAt: { lt: threshold } },
      data: { enrichmentStatus: 'failed', enrichedAt: now },
    });

    if (count > 0) {
      this.logger.warn(
        `${count} ticket(s) en processing sin callback tras ${
          PROCESSING_TIMEOUT_MS / 60_000
        } min; se marcaron como failed.`,
      );
    }
  }
}
