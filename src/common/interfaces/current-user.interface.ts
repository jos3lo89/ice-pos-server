import { Role } from '../enums/role.enum';

export interface CurrentUserInterface {
  id: number;
  userName: string;
  role: Role;
  iat: number;
  exp: number;
}
