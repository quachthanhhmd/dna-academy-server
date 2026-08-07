import { ApiProperty } from '@nestjs/swagger';
import { Role } from '../../roles/domain/role';

export class RoleWithStatsDto extends Role {
  @ApiProperty({ type: () => Number })
  assignedUsersCount: number;
}
