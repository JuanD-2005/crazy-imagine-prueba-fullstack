import type { UserRole } from '../../generated/prisma/enums.js';

export interface AuthenticatedUser {
  userId: number;
  email: string;
  role: UserRole;
}
