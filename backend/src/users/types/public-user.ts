import type { UserRole } from '../../generated/prisma/enums.js';

export interface PublicUser {
  id: number;
  name: string;
  email: string;
  role: UserRole;
}
