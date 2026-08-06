import { ModuleDto } from '../../modules/dto/module.dto';

import {
  // decorators here
  Type,
} from 'class-transformer';

import {
  // decorators here

  ValidateNested,
  IsNotEmptyObject,
  IsString,
  IsOptional,
} from 'class-validator';

import {
  // decorators here
  ApiProperty,
} from '@nestjs/swagger';

export class CreatePermissionDto {
  @ApiProperty({
    required: false,
    type: () => String,
  })
  @IsOptional()
  @IsString()
  label?: string | null;

  @ApiProperty({
    required: true,
    type: () => String,
  })
  @IsString()
  action: string;

  @ApiProperty({
    required: true,
    type: () => ModuleDto,
  })
  @ValidateNested()
  @Type(() => ModuleDto)
  @IsNotEmptyObject()
  module: ModuleDto;

  // Don't forget to use the class-validator decorators in the DTO properties.
}
