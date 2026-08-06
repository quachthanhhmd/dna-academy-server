import { User } from '../../users/domain/user';
import { Exclude } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class MasterDataGroup {
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
  groupKey: string;

  @ApiProperty({
    type: String,
  })
  id: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
