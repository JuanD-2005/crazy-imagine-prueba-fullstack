import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module.js';
import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

interface TicketBody {
  id: number;
  enrichmentStatus: string;
  priority: string | null;
  category: string | null;
  tags: string[];
  suggestedReply: string | null;
}

describe('Webhooks (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let secret: string;

  const createdTicketIds: number[] = [];

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    app.useGlobalFilters(new AllExceptionsFilter());
    await app.init();

    prisma = moduleFixture.get(PrismaService);

    const configuredSecret = process.env.N8N_WEBHOOK_SECRET;
    if (!configuredSecret) {
      throw new Error(
        'N8N_WEBHOOK_SECRET no está definido en el entorno de test',
      );
    }
    secret = configuredSecret;
  });

  afterAll(async () => {
    if (createdTicketIds.length > 0) {
      await prisma.ticket.deleteMany({
        where: { id: { in: createdTicketIds } },
      });
    }
    await app.close();
  });

  async function createTestTicket() {
    const ticket = await prisma.ticket.create({
      data: {
        title: 'Ticket de prueba para webhook',
        description:
          'Creado directo por Prisma para probar el callback de n8n.',
        createdById: 2,
      },
    });
    createdTicketIds.push(ticket.id);
    return ticket;
  }

  it('valid secret with status=done updates priority/category/tags/suggestedReply', async () => {
    const ticket = await createTestTicket();

    const response = await request(app.getHttpServer())
      .post('/webhooks/n8n/enrichment')
      .set('X-Webhook-Secret', secret)
      .send({
        ticketId: ticket.id,
        status: 'done',
        priority: 'high',
        category: 'technical',
        tags: ['bug', 'urgente'],
        suggestedReply: 'Respuesta sugerida por n8n.',
      })
      .expect(200);

    const body = response.body as TicketBody;
    expect(body).toMatchObject({
      id: ticket.id,
      enrichmentStatus: 'done',
      priority: 'high',
      category: 'technical',
      tags: ['bug', 'urgente'],
      suggestedReply: 'Respuesta sugerida por n8n.',
    });
  });

  it('status=failed only updates enrichmentStatus and enrichedAt', async () => {
    const ticket = await createTestTicket();

    const response = await request(app.getHttpServer())
      .post('/webhooks/n8n/enrichment')
      .set('X-Webhook-Secret', secret)
      .send({
        ticketId: ticket.id,
        status: 'failed',
        reason: 'timeout en el proveedor',
      })
      .expect(200);

    const body = response.body as TicketBody;
    expect(body.enrichmentStatus).toBe('failed');
    expect(body.priority).toBeNull();
    expect(body.category).toBeNull();
  });

  it('missing secret returns 401 and leaves the ticket untouched', async () => {
    const ticket = await createTestTicket();

    await request(app.getHttpServer())
      .post('/webhooks/n8n/enrichment')
      .send({
        ticketId: ticket.id,
        status: 'done',
        priority: 'high',
        category: 'technical',
      })
      .expect(401);

    const unchanged = await prisma.ticket.findUnique({
      where: { id: ticket.id },
    });
    expect(unchanged?.enrichmentStatus).toBe('pending');
  });

  it('incorrect secret returns 401 and leaves the ticket untouched', async () => {
    const ticket = await createTestTicket();

    await request(app.getHttpServer())
      .post('/webhooks/n8n/enrichment')
      .set('X-Webhook-Secret', 'not-the-real-secret')
      .send({
        ticketId: ticket.id,
        status: 'done',
        priority: 'high',
        category: 'technical',
      })
      .expect(401);

    const unchanged = await prisma.ticket.findUnique({
      where: { id: ticket.id },
    });
    expect(unchanged?.enrichmentStatus).toBe('pending');
  });

  it('nonexistent ticketId returns 404', async () => {
    await request(app.getHttpServer())
      .post('/webhooks/n8n/enrichment')
      .set('X-Webhook-Secret', secret)
      .send({
        ticketId: 999999,
        status: 'done',
        priority: 'high',
        category: 'technical',
      })
      .expect(404);
  });

  it('status=done without priority/category returns 400', async () => {
    const ticket = await createTestTicket();

    await request(app.getHttpServer())
      .post('/webhooks/n8n/enrichment')
      .set('X-Webhook-Secret', secret)
      .send({ ticketId: ticket.id, status: 'done' })
      .expect(400);
  });
});
