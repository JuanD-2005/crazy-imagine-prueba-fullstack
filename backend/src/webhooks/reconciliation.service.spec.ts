import { Test } from '@nestjs/testing';
import { N8nNotifierService } from './n8n-notifier.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { ReconciliationService } from './reconciliation.service.js';

describe('ReconciliationService', () => {
  let service: ReconciliationService;
  let prisma: {
    ticket: {
      findMany: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
      updateMany: ReturnType<typeof vi.fn>;
    };
  };
  let notifier: { notifyTicketCreated: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    prisma = {
      ticket: {
        findMany: vi.fn().mockResolvedValue([]),
        update: vi.fn(),
        updateMany: vi.fn().mockResolvedValue({ count: 0 }),
      },
    };
    notifier = { notifyTicketCreated: vi.fn() };

    const module = await Test.createTestingModule({
      providers: [
        ReconciliationService,
        { provide: PrismaService, useValue: prisma },
        { provide: N8nNotifierService, useValue: notifier },
      ],
    }).compile();

    service = module.get(ReconciliationService);

    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('reintenta un ticket pending nunca notificado y lo pasa a processing si el POST a n8n tiene éxito', async () => {
    prisma.ticket.findMany.mockResolvedValue([
      {
        id: 1,
        title: 'Ticket 1',
        description: 'desc',
        notifyAttempts: 0,
        lastNotifyAttemptAt: null,
      },
    ]);
    notifier.notifyTicketCreated.mockResolvedValue(true);

    await service.retryPendingTickets();

    expect(notifier.notifyTicketCreated).toHaveBeenCalledWith({
      ticketId: 1,
      title: 'Ticket 1',
      description: 'desc',
    });
    expect(prisma.ticket.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: {
        enrichmentStatus: 'processing',
        notifyAttempts: 1,
        lastNotifyAttemptAt: new Date('2026-01-01T00:00:00.000Z'),
      },
    });
  });

  it('no reintenta un ticket pending si todavía no venció su ventana de backoff', async () => {
    prisma.ticket.findMany.mockResolvedValue([
      {
        id: 2,
        title: 'Ticket 2',
        description: 'desc',
        notifyAttempts: 1,
        // Último intento hace 2 min; el backoff para notifyAttempts=1 es 5 min.
        lastNotifyAttemptAt: new Date('2025-12-31T23:58:00.000Z'),
      },
    ]);

    await service.retryPendingTickets();

    expect(notifier.notifyTicketCreated).not.toHaveBeenCalled();
    expect(prisma.ticket.update).not.toHaveBeenCalled();
  });

  it('marca el ticket como failed al agotar los 3 reintentos sin éxito', async () => {
    prisma.ticket.findMany.mockResolvedValue([
      {
        id: 3,
        title: 'Ticket 3',
        description: 'desc',
        notifyAttempts: 2,
        // Backoff para notifyAttempts=2 es 15 min; pasaron 16.
        lastNotifyAttemptAt: new Date('2025-12-31T23:44:00.000Z'),
      },
    ]);
    notifier.notifyTicketCreated.mockResolvedValue(false);

    await service.retryPendingTickets();

    expect(prisma.ticket.update).toHaveBeenCalledWith({
      where: { id: 3 },
      data: {
        enrichmentStatus: 'failed',
        notifyAttempts: 3,
        lastNotifyAttemptAt: new Date('2026-01-01T00:00:00.000Z'),
        enrichedAt: new Date('2026-01-01T00:00:00.000Z'),
      },
    });
  });

  it('marca como failed los tickets en processing sin callback hace más de 10 minutos', async () => {
    prisma.ticket.updateMany.mockResolvedValue({ count: 2 });

    await service.timeoutStaleProcessingTickets();

    expect(prisma.ticket.updateMany).toHaveBeenCalledWith({
      where: {
        enrichmentStatus: 'processing',
        updatedAt: { lt: new Date('2025-12-31T23:50:00.000Z') },
      },
      data: {
        enrichmentStatus: 'failed',
        enrichedAt: new Date('2026-01-01T00:00:00.000Z'),
      },
    });
  });
});
