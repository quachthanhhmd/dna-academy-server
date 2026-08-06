import { Permission } from '../../permissions/domain/permission';

import { Role } from '../../roles/domain/role';

import { ApiProperty } from '@nestjs/swagger';

export class RolePermission {
  @ApiProperty({
    type: () => Permission,
    nullable: false,
  })
  permission: Permission;

  @ApiProperty({
    type: () => Role,
    nullable: false,
  })
  role: Role;

  @ApiProperty({
    type: String,
  })
  id: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
