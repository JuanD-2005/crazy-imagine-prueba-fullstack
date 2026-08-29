import { HttpService } from '@nestjs/axios';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { of, throwError } from 'rxjs';
import request from 'supertest';
import type { App } from 'supertest/types';
import type { Mock } from 'vitest';
import { AppModule } from '../src/app.module.js';
import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

function mockAxiosResponse(status: number) {
  return of({
    status,
    statusText: 'OK',
    data: {},
    headers: {},
    config: {},
  } as never);
}

interface TicketBody {
  id: number;
  title: string;
  createdById: number;
  assignedToId: number | null;
  enrichmentStatus: string;
}

interface TicketListBody {
  data: TicketBody[];
  total: number;
  page: number;
  limit: number;
}

async function login(
  app: INestApplication<App>,
  email: string,
  password: string,
) {
  const response = await request(app.getHttpServer())
    .post('/auth/login')
    .send({ email, password })
    .expect(200);
  return (response.body as { accessToken: string }).accessToken;
}

describe('Tickets (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let adminToken: string;
  let brunoToken: string;
  let carlaToken: string;
  let httpServicePost: Mock;

  const createdTicketIds: number[] = [];

  beforeAll(async () => {
    const httpServiceMock = { post: vi.fn(() => mockAxiosResponse(200)) };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(HttpService)
      .useValue(httpServiceMock)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    app.useGlobalFilters(new AllExceptionsFilter());
    await app.init();

    prisma = moduleFixture.get(PrismaService);
    httpServicePost = httpServiceMock.post;

    adminToken = await login(app, 'admin@crazysupporthub.test', 'Admin1234!');
    brunoToken = await login(
      app,
      'bruno.agente@crazysupporthub.test',
      'Agent1234!',
    );
    carlaToken = await login(
      app,
      'carla.agente@crazysupporthub.test',
      'Agent1234!',
    );
  });

  afterAll(async () => {
    if (createdTicketIds.length > 0) {
      await prisma.ticket.deleteMany({
        where: { id: { in: createdTicketIds } },
      });
    }
    await app.close();
  });

  it('POST /tickets with a valid token creates a ticket owned by the caller and notifies n8n', async () => {
    httpServicePost.mockClear();

    const response = await request(app.getHttpServer())
      .post('/tickets')
      .set('Authorization', `Bearer ${brunoToken}`)
      .send({
        title: 'Ticket de prueba e2e',
        description:
          'Descripción de prueba con longitud suficiente para pasar la validación.',
      })
      .expect(201);

    const body = response.body as TicketBody;
    createdTicketIds.push(body.id);

    expect(body).toMatchObject({
      title: 'Ticket de prueba e2e',
      createdById: 2,
      assignedToId: null,
      // El mock de HttpService responde 2xx por defecto, así que el ticket
      // debe pasar de "pending" a "processing" tras notificar a n8n.
      enrichmentStatus: 'processing',
    });

    expect(httpServicePost).toHaveBeenCalledTimes(1);
    expect(httpServicePost).toHaveBeenCalledWith(
      process.env.N8N_WEBHOOK_URL,
      {
        ticketId: body.id,
        title: 'Ticket de prueba e2e',
        description:
          'Descripción de prueba con longitud suficiente para pasar la validación.',
      },
      expect.objectContaining({
        headers: { 'X-Webhook-Secret': process.env.N8N_WEBHOOK_SECRET },
        timeout: 5000,
      }),
    );
  });

  it('POST /tickets still returns 201 and stays "pending" when n8n is unreachable', async () => {
    httpServicePost.mockImplementationOnce(() =>
      throwError(() => new Error('n8n is down')),
    );

    const response = await request(app.getHttpServer())
      .post('/tickets')
      .set('Authorization', `Bearer ${brunoToken}`)
      .send({
        title: 'Ticket con n8n caído',
        description: 'La creación no debe fallar aunque n8n no responda.',
      })
      .expect(201);

    const body = response.body as TicketBody;
    createdTicketIds.push(body.id);

    expect(body.enrichmentStatus).toBe('pending');
  });

  it('POST /tickets without a token returns 401', async () => {
    await request(app.getHttpServer())
      .post('/tickets')
      .send({ title: 'x'.repeat(5), description: 'y'.repeat(20) })
      .expect(401);
  });

  it('an agent viewing a ticket that belongs to another agent gets 403', async () => {
    // Ticket 6 fue creado por Carla (createdBy=3, assignedTo=3) en el seed;
    // Bruno (id=2) no participa en él.
    await request(app.getHttpServer())
      .get('/tickets/6')
      .set('Authorization', `Bearer ${brunoToken}`)
      .expect(403);
  });

  it('an agent editing a ticket that belongs to another agent gets 403', async () => {
    await request(app.getHttpServer())
      .patch('/tickets/6')
      .set('Authorization', `Bearer ${brunoToken}`)
      .send({ priority: 'high' })
      .expect(403);
  });

  it('an agent updates the status of their own ticket and it persists', async () => {
    const created = await request(app.getHttpServer())
      .post('/tickets')
      .set('Authorization', `Bearer ${brunoToken}`)
      .send({
        title: 'Ticket para probar cambio de status',
        description:
          'Verifica que un agent pueda actualizar el status de su propio ticket.',
      })
      .expect(201);

    const ticketId = (created.body as TicketBody).id;
    createdTicketIds.push(ticketId);

    const patchResponse = await request(app.getHttpServer())
      .patch(`/tickets/${ticketId}`)
      .set('Authorization', `Bearer ${brunoToken}`)
      .send({ status: 'in_progress' })
      .expect(200);

    expect((patchResponse.body as { status: string }).status).toBe(
      'in_progress',
    );

    const getResponse = await request(app.getHttpServer())
      .get(`/tickets/${ticketId}`)
      .set('Authorization', `Bearer ${brunoToken}`)
      .expect(200);

    expect((getResponse.body as { status: string }).status).toBe('in_progress');
  });

  it('an admin updates the status of a ticket they do not own', async () => {
    const created = await request(app.getHttpServer())
      .post('/tickets')
      .set('Authorization', `Bearer ${carlaToken}`)
      .send({
        title: 'Ticket de Carla para que el admin lo cierre',
        description:
          'Verifica que un admin pueda actualizar el status de un ticket ajeno.',
      })
      .expect(201);

    const ticketId = (created.body as TicketBody).id;
    createdTicketIds.push(ticketId);

    // "resolved" a propósito, no "closed": el test de abajo
    // ("filtering by status=closed") espera exactamente los 2 tickets
    // "closed" del seed, y este ticket recién creado no se borra hasta
    // el afterAll del archivo.
    await request(app.getHttpServer())
      .patch(`/tickets/${ticketId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'resolved' })
      .expect(200);

    const getResponse = await request(app.getHttpServer())
      .get(`/tickets/${ticketId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect((getResponse.body as { status: string }).status).toBe('resolved');
  });

  it('GET /tickets/:id for a nonexistent ticket returns 404', async () => {
    await request(app.getHttpServer())
      .get('/tickets/999999')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(404);
  });

  it('admin sees every ticket with no extra filter', async () => {
    const response = await request(app.getHttpServer())
      .get('/tickets?limit=50')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const body = response.body as TicketListBody;
    // 12 tickets del seed + los creados por este archivo de tests.
    expect(body.total).toBeGreaterThanOrEqual(12);
    const ids = body.data.map((t) => t.id);
    for (const seedId of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]) {
      expect(ids).toContain(seedId);
    }
  });

  it('an agent only sees tickets they created or are assigned to', async () => {
    const response = await request(app.getHttpServer())
      .get('/tickets?limit=50')
      .set('Authorization', `Bearer ${carlaToken}`)
      .expect(200);

    const body = response.body as TicketListBody;
    for (const ticket of body.data) {
      expect(ticket.createdById === 3 || ticket.assignedToId === 3).toBe(true);
    }
    // Tickets 1, 5, 9, 11 son de Bruno en exclusiva (createdBy=2, sin asignar).
    const ids = body.data.map((t) => t.id);
    expect(ids).not.toContain(1);
  });

  it('filtering by status=closed returns only the closed seeded tickets', async () => {
    const response = await request(app.getHttpServer())
      .get('/tickets?status=closed')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const body = response.body as TicketListBody;
    expect(body.total).toBe(2);
    expect(body.data.map((t) => t.id).sort((a, b) => a - b)).toEqual([8, 12]);
  });

  it('searching by text returns only the matching seeded ticket', async () => {
    const response = await request(app.getHttpServer())
      .get('/tickets?search=suscripci%C3%B3n')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const body = response.body as TicketListBody;
    expect(body.total).toBe(1);
    expect(body.data[0]?.id).toBe(6);
  });

  it('DELETE /tickets/:id is forbidden for agents', async () => {
    await request(app.getHttpServer())
      .delete('/tickets/2')
      .set('Authorization', `Bearer ${brunoToken}`)
      .expect(403);
  });
});
