import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsInt } from 'class-validator';
import { StatusEnum } from '../../statuses/statuses.enum';

export class SetUserStatusDto {
  @ApiProperty({
    enum: [StatusEnum.active, StatusEnum.deactivated],
    description:
      '1 active, 3 deactivated. 2 (email not confirmed) is where registration ' +
      'leaves an account, not something an admin sets.',
  })
  @IsInt()
  @IsIn([StatusEnum.active, StatusEnum.deactivated])
  statusId: number;
}
