import { RolUsuario } from '@/generated/prisma/enums';

export interface CurrentUserI {
  id: string;
  role: RolUsuario;
  userName: string;
}
