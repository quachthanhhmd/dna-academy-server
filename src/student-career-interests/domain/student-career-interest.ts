import { MasterDataCode } from '../../master-data-codes/domain/master-data-code';

import { User } from '../../users/domain/user';

import { ApiProperty } from '@nestjs/swagger';

export class StudentCareerInterest {
  @ApiProperty({
    type: () => String,
    nullable: true,
  })
  customInterest?: string | null;

  @ApiProperty({
    type: () => MasterDataCode,
    nullable: false,
  })
  careerInterest: MasterDataCode;

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
