import { Module } from '@nestjs/common';
import { WebhooksModule } from '../webhooks/webhooks.module.js';
import { TicketsController } from './tickets.controller.js';
import { TicketsService } from './tickets.service.js';

@Module({
  imports: [WebhooksModule],
  controllers: [TicketsController],
  providers: [TicketsService],
})
export class TicketsModule {}
