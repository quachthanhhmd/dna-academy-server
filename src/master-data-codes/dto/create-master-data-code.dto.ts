import { UserDto } from '../../users/dto/user.dto';

import { MasterDataGroupDto } from '../../master-data-groups/dto/master-data-group.dto';

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
  IsBoolean,
  IsNumber,
} from 'class-validator';

import {
  // decorators here
  ApiProperty,
} from '@nestjs/swagger';

export class CreateMasterDataCodeDto {
  createdBy?: UserDto | null;

  @ApiProperty({
    required: true,
    type: () => Number,
  })
  @IsNumber()
  displayOrder: number;

  @ApiProperty({
    required: true,
    type: () => Boolean,
  })
  @IsBoolean()
  isActive: boolean;

  @ApiProperty({
    required: false,
    type: () => String,
  })
  @IsOptional()
  @IsString()
  thumbnailUrl?: string | null;

  @ApiProperty({
    required: false,
    type: () => String,
  })
  @IsOptional()
  @IsString()
  description?: string | null;

  @ApiProperty({
    required: true,
    type: () => String,
  })
  @IsString()
  name: string;

  @ApiProperty({
    required: true,
    type: () => String,
  })
  @IsString()
  code: string;

  @ApiProperty({
    required: true,
    type: () => MasterDataGroupDto,
  })
  @ValidateNested()
  @Type(() => MasterDataGroupDto)
  @IsNotEmptyObject()
  group: MasterDataGroupDto;

  // Don't forget to use the class-validator decorators in the DTO properties.
}
