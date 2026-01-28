import { Role } from '../enums/role.enum';

export interface JwtPayload {
  sub: number;
  userName: string;
  role: Role;
}
