import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import type { UserRole } from '../generated/prisma/enums.js';
import type { PublicUser } from './types/public-user.js';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  findById(id: number) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async create(data: {
    name: string;
    email: string;
    passwordHash: string;
    role: UserRole;
  }) {
    return this.prisma.user.create({ data });
  }

  async findAllPublic(): Promise<PublicUser[]> {
    return this.prisma.user.findMany({
      select: { id: true, name: true, email: true, role: true },
      orderBy: { id: 'asc' },
    });
  }

  toPublicUser(user: {
    id: number;
    name: string;
    email: string;
    role: UserRole;
  }): PublicUser {
    return { id: user.id, name: user.name, email: user.email, role: user.role };
  }
}
