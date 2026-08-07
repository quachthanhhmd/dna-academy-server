import { RoleDto } from '../../roles/dto/role.dto';

import { UserDto } from '../../users/dto/user.dto';

import {
  // decorators here
  Type,
} from 'class-transformer';

import {
  // decorators here

  ValidateNested,
  IsNotEmptyObject,
  IsOptional,
  IsDate,
} from 'class-validator';

import {
  // decorators here
  ApiProperty,
  ApiPropertyOptional,
} from '@nestjs/swagger';

export class CreateUserRoleDto {
  assignedBy?: UserDto | null;

  @ApiPropertyOptional({
    description: 'Defaults to the current time when omitted.',
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  assignedAt?: Date;

  @ApiProperty({
    required: true,
    type: () => RoleDto,
  })
  @ValidateNested()
  @Type(() => RoleDto)
  @IsNotEmptyObject()
  role: RoleDto;

  @ApiProperty({
    required: true,
    type: () => UserDto,
  })
  @ValidateNested()
  @Type(() => UserDto)
  @IsNotEmptyObject()
  user: UserDto;

  // Don't forget to use the class-validator decorators in the DTO properties.
}
