import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  EnrichmentCallbackStatus,
  type EnrichmentCallbackDto,
} from './dto/enrichment-callback.dto.js';

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(private readonly prisma: PrismaService) {}

  async handleEnrichmentCallback(dto: EnrichmentCallbackDto) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: dto.ticketId },
    });
    if (!ticket) {
      throw new NotFoundException(`Ticket ${dto.ticketId} no encontrado`);
    }

    if (dto.status === EnrichmentCallbackStatus.failed) {
      if (dto.reason) {
        this.logger.warn(
          `Enriquecimiento fallido para ticket ${dto.ticketId}: ${dto.reason}`,
        );
      }
      return this.prisma.ticket.update({
        where: { id: dto.ticketId },
        data: { enrichmentStatus: 'failed', enrichedAt: new Date() },
      });
    }

    return this.prisma.ticket.update({
      where: { id: dto.ticketId },
      data: {
        priority: dto.priority,
        category: dto.category,
        ...(dto.tags !== undefined && { tags: dto.tags }),
        ...(dto.suggestedReply !== undefined && {
          suggestedReply: dto.suggestedReply,
        }),
        enrichmentStatus: 'done',
        enrichedAt: new Date(),
      },
    });
  }
}
