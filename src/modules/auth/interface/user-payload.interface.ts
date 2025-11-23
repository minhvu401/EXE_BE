import { Role } from '../enum/role.enum';

export interface UserPayload {
  sub: string;
  role: Role;
}
