import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { WebhookSecretGuard } from './guards/webhook-secret.guard.js';
import { N8nNotifierService } from './n8n-notifier.service.js';
import { ReconciliationService } from './reconciliation.service.js';
import { WebhooksController } from './webhooks.controller.js';
import { WebhooksService } from './webhooks.service.js';

@Module({
  imports: [HttpModule, ScheduleModule.forRoot()],
  controllers: [WebhooksController],
  providers: [
    N8nNotifierService,
    WebhooksService,
    WebhookSecretGuard,
    ReconciliationService,
  ],
  exports: [N8nNotifierService],
})
export class WebhooksModule {}
