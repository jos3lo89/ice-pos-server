import { Role } from '../enums/role.enum';

export interface CurrentUserInterface {
  id: number;
  email: string;
  roles: Role[];
}
