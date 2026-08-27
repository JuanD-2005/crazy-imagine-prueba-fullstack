import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Public } from '../auth/decorators/public.decorator.js';
import { EnrichmentCallbackDto } from './dto/enrichment-callback.dto.js';
import { WebhookSecretGuard } from './guards/webhook-secret.guard.js';
import { WebhooksService } from './webhooks.service.js';

@Controller('webhooks/n8n')
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  @Public()
  @UseGuards(WebhookSecretGuard)
  @HttpCode(HttpStatus.OK)
  @Post('enrichment')
  handleEnrichment(@Body() dto: EnrichmentCallbackDto) {
    return this.webhooksService.handleEnrichmentCallback(dto);
  }
}
