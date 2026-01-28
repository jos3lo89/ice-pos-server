import { Role } from '../enums/role.enum';

export interface CurrentUserI {
  id: number;
  userName: string;
  role: Role;
}
