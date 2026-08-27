import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.js';
import { Prisma } from '../generated/prisma/client.js';
import type { CreateTicketDto } from './dto/create-ticket.dto.js';
import type { QueryTicketsDto } from './dto/query-tickets.dto.js';
import type { UpdateTicketDto } from './dto/update-ticket.dto.js';

/**
 * Política de autorización de tickets (a nivel de servicio, no solo del guard):
 *
 * - admin: ve, edita y elimina cualquier ticket sin restricción.
 * - agent: solo ve y edita tickets donde sea `createdBy` o `assignedTo`.
 *   - Si el ticket existe pero no le pertenece → 403 Forbidden.
 *   - Si el ticket no existe → 404 Not Found.
 *   - Un agent nunca puede eliminar tickets (DELETE es exclusivo de admin,
 *     forzado con @Roles('admin') en el controller).
 * - El filtro de visibilidad por rol se aplica en el WHERE de la consulta
 *   (antes de paginar), no filtrando en memoria después de traer resultados.
 */
@Injectable()
export class TicketsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: AuthenticatedUser, dto: CreateTicketDto) {
    return this.prisma.ticket.create({
      data: {
        title: dto.title,
        description: dto.description,
        createdById: user.userId,
        assignedToId: dto.assignedTo ?? null,
      },
    });
  }

  async findAll(user: AuthenticatedUser, query: QueryTicketsDto) {
    const andConditions: Prisma.TicketWhereInput[] = [];

    if (query.status) {
      andConditions.push({ status: query.status });
    }
    if (query.priority) {
      andConditions.push({ priority: query.priority });
    }
    if (query.category) {
      andConditions.push({ category: query.category });
    }
    if (query.search) {
      andConditions.push({
        OR: [
          { title: { contains: query.search, mode: 'insensitive' } },
          { description: { contains: query.search, mode: 'insensitive' } },
        ],
      });
    }
    if (user.role !== 'admin') {
      andConditions.push({
        OR: [{ createdById: user.userId }, { assignedToId: user.userId }],
      });
    }

    const where: Prisma.TicketWhereInput =
      andConditions.length > 0 ? { AND: andConditions } : {};

    const page = query.page;
    const limit = query.limit;

    const [data, total] = await this.prisma.$transaction([
      this.prisma.ticket.findMany({
        where,
        orderBy: { [query.sortBy]: query.sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.ticket.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async findOneOrThrow(user: AuthenticatedUser, id: number) {
    const ticket = await this.prisma.ticket.findUnique({ where: { id } });
    if (!ticket) {
      throw new NotFoundException(`Ticket ${id} no encontrado`);
    }

    this.assertCanAccess(user, ticket);
    return ticket;
  }

  async update(user: AuthenticatedUser, id: number, dto: UpdateTicketDto) {
    await this.findOneOrThrow(user, id);

    return this.prisma.ticket.update({
      where: { id },
      data: {
        ...(dto.status !== undefined && { status: dto.status }),
        ...(dto.assignedTo !== undefined && { assignedToId: dto.assignedTo }),
        ...(dto.priority !== undefined && { priority: dto.priority }),
        ...(dto.category !== undefined && { category: dto.category }),
        ...(dto.tags !== undefined && { tags: dto.tags }),
      },
    });
  }

  async remove(id: number) {
    const ticket = await this.prisma.ticket.findUnique({ where: { id } });
    if (!ticket) {
      throw new NotFoundException(`Ticket ${id} no encontrado`);
    }

    await this.prisma.ticket.delete({ where: { id } });
  }

  private assertCanAccess(
    user: AuthenticatedUser,
    ticket: { createdById: number; assignedToId: number | null },
  ) {
    if (user.role === 'admin') {
      return;
    }
    const owns =
      ticket.createdById === user.userId || ticket.assignedToId === user.userId;
    if (!owns) {
      throw new ForbiddenException('No tienes acceso a este ticket');
    }
  }
}
