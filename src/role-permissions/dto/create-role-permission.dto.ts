import { PermissionDto } from '../../permissions/dto/permission.dto';

import { RoleDto } from '../../roles/dto/role.dto';

import {
  // decorators here
  Type,
} from 'class-transformer';

import {
  // decorators here

  ValidateNested,
  IsNotEmptyObject,
} from 'class-validator';

import {
  // decorators here
  ApiProperty,
} from '@nestjs/swagger';

export class CreateRolePermissionDto {
  @ApiProperty({
    required: true,
    type: () => PermissionDto,
  })
  @ValidateNested()
  @Type(() => PermissionDto)
  @IsNotEmptyObject()
  permission: PermissionDto;

  @ApiProperty({
    required: true,
    type: () => RoleDto,
  })
  @ValidateNested()
  @Type(() => RoleDto)
  @IsNotEmptyObject()
  role: RoleDto;

  // Don't forget to use the class-validator decorators in the DTO properties.
}
