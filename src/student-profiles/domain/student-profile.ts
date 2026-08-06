import { MasterDataCode } from '../../master-data-codes/domain/master-data-code';

import { User } from '../../users/domain/user';

import { ApiProperty } from '@nestjs/swagger';

export class StudentProfile {
  @ApiProperty({
    type: () => MasterDataCode,
    nullable: true,
  })
  educationStageCode?: MasterDataCode | null;

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
