import { ApiProperty } from '@nestjs/swagger';
import { ArrayUnique, IsArray, IsInt } from 'class-validator';

export class SetUserRolesDto {
  @ApiProperty({ type: [Number] })
  @IsArray()
  @ArrayUnique()
  @IsInt({ each: true })
  roleIds: number[];
}
