import { MasterDataCode } from '../../master-data-codes/domain/master-data-code';

import { User } from '../../users/domain/user';

import { ApiProperty } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';
import { CurrentStatusDto } from '../dto/current-status.dto';

export class StudentProfile {
  @Exclude({ toPlainOnly: true })
  currentStatusCode?: MasterDataCode | null;

  @Exclude({ toPlainOnly: true })
  customStatus?: string | null;

  @ApiProperty({ type: () => CurrentStatusDto, nullable: true })
  currentStatus?: CurrentStatusDto | null;

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
