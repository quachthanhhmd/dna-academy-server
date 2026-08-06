import { UserDto } from '../../users/dto/user.dto';

import {
  // decorators here

  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
} from 'class-validator';

import {
  // decorators here
  ApiProperty,
} from '@nestjs/swagger';

export class CreateMasterDataGroupDto {
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
  groupKey: string;

  // Don't forget to use the class-validator decorators in the DTO properties.
}
