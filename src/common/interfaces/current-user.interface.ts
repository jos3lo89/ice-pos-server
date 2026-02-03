import { UserRole } from '@/generated/prisma/enums';

export interface CurrentUserI {
  id: string;
  role: UserRole;
  userName: string;
}
