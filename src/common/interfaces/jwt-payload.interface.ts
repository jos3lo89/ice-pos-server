import { RolUsuario } from '@/generated/prisma/enums';

export interface JwtPayload {
  sub: string;
  userName: string;
  role: RolUsuario;
  iat: number;
  exp: number;
}
