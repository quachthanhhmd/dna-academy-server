import { User } from '../../users/domain/user';
import { Exclude } from 'class-transformer';
import { MasterDataGroup } from '../../master-data-groups/domain/master-data-group';

import { ApiProperty } from '@nestjs/swagger';

export class MasterDataCode {
  @Exclude({ toPlainOnly: true })
  createdBy?: User | null;

  @ApiProperty({
    type: () => Number,
    nullable: false,
  })
  displayOrder: number;

  @ApiProperty({
    type: () => Boolean,
    nullable: false,
  })
  isActive: boolean;

  @ApiProperty({
    type: () => String,
    nullable: true,
  })
  thumbnailUrl?: string | null;

  @ApiProperty({
    type: () => String,
    nullable: true,
  })
  description?: string | null;

  @ApiProperty({
    type: () => String,
    nullable: false,
  })
  name: string;

  @ApiProperty({
    type: () => String,
    nullable: false,
  })
  code: string;

  @ApiProperty({
    type: () => MasterDataGroup,
    nullable: false,
  })
  group: MasterDataGroup;

  @ApiProperty({
    type: String,
  })
  id: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
