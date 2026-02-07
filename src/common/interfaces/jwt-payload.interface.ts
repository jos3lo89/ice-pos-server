import { UserRole } from '@/generated/prisma/enums';

export interface JwtPayload {
  sub: string;
  userName: string;
  role: UserRole;
  iat: number;
  exp: number;
}
