import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcrypt';
import {
  PrismaClient,
  type TicketCategory,
  type TicketPriority,
  type TicketStatus,
  type EnrichmentStatus,
  type UserRole,
} from '../src/generated/prisma/client.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const BCRYPT_COST_FACTOR = 10;

interface SeedUser {
  id: number;
  name: string;
  email: string;
  password: string;
  role: UserRole;
}

interface SeedTicket {
  id: number;
  title: string;
  description: string;
  status: TicketStatus;
  createdBy: number;
  assignedTo: number | null;
  priority: TicketPriority | null;
  category: TicketCategory | null;
  tags: string[];
  suggestedReply: string | null;
  enrichmentStatus: EnrichmentStatus;
  enrichedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface SeedData {
  users: SeedUser[];
  tickets: SeedTicket[];
}

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const seedPath = join(__dirname, 'tickets-seed.json');
  const seedData = JSON.parse(readFileSync(seedPath, 'utf-8')) as SeedData;

  for (const user of seedData.users) {
    const passwordHash = await bcrypt.hash(user.password, BCRYPT_COST_FACTOR);
    await prisma.user.upsert({
      where: { id: user.id },
      update: {
        name: user.name,
        email: user.email,
        passwordHash,
        role: user.role,
      },
      create: {
        id: user.id,
        name: user.name,
        email: user.email,
        passwordHash,
        role: user.role,
      },
    });
  }

  for (const ticket of seedData.tickets) {
    await prisma.ticket.upsert({
      where: { id: ticket.id },
      update: {
        title: ticket.title,
        description: ticket.description,
        status: ticket.status,
        createdById: ticket.createdBy,
        assignedToId: ticket.assignedTo,
        priority: ticket.priority,
        category: ticket.category,
        tags: ticket.tags,
        suggestedReply: ticket.suggestedReply,
        enrichmentStatus: ticket.enrichmentStatus,
        enrichedAt: ticket.enrichedAt ? new Date(ticket.enrichedAt) : null,
        createdAt: new Date(ticket.createdAt),
        updatedAt: new Date(ticket.updatedAt),
      },
      create: {
        id: ticket.id,
        title: ticket.title,
        description: ticket.description,
        status: ticket.status,
        createdById: ticket.createdBy,
        assignedToId: ticket.assignedTo,
        priority: ticket.priority,
        category: ticket.category,
        tags: ticket.tags,
        suggestedReply: ticket.suggestedReply,
        enrichmentStatus: ticket.enrichmentStatus,
        enrichedAt: ticket.enrichedAt ? new Date(ticket.enrichedAt) : null,
        createdAt: new Date(ticket.createdAt),
        updatedAt: new Date(ticket.updatedAt),
      },
    });
  }

  // El seed inserta ids explícitos vía upsert, lo que no avanza las
  // secuencias autoincrement de Postgres. Sin este paso, la siguiente
  // fila creada sin id explícito (p. ej. desde la API) choca con un id
  // ya usado por el seed y falla con "Unique constraint failed".
  await prisma.$executeRawUnsafe(
    `SELECT setval(pg_get_serial_sequence('"User"', 'id'), COALESCE((SELECT MAX(id) FROM "User"), 1))`,
  );
  await prisma.$executeRawUnsafe(
    `SELECT setval(pg_get_serial_sequence('"Ticket"', 'id'), COALESCE((SELECT MAX(id) FROM "Ticket"), 1))`,
  );

  console.log(
    `Seed completo: ${seedData.users.length} usuarios, ${seedData.tickets.length} tickets.`,
  );
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });
