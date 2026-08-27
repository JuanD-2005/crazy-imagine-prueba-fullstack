import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { WebhookSecretGuard } from './guards/webhook-secret.guard.js';
import { N8nNotifierService } from './n8n-notifier.service.js';
import { WebhooksController } from './webhooks.controller.js';
import { WebhooksService } from './webhooks.service.js';

@Module({
  imports: [HttpModule],
  controllers: [WebhooksController],
  providers: [N8nNotifierService, WebhooksService, WebhookSecretGuard],
  exports: [N8nNotifierService],
})
export class WebhooksModule {}
