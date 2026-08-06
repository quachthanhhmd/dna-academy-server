import { Exclude } from 'class-transformer';
import { Role } from '../../roles/domain/role';

import { User } from '../../users/domain/user';

import { ApiProperty } from '@nestjs/swagger';

export class UserRole {
  @Exclude({ toPlainOnly: true })
  assignedBy?: User | null;

  @Exclude({ toPlainOnly: true })
  assignedAt?: Date;

  @ApiProperty({
    type: () => Role,
    nullable: false,
  })
  role: Role;

  @ApiProperty({
    type: () => User,
    nullable: false,
  })
  user: User;

  @ApiProperty({
    type: String,
  })
  id: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
