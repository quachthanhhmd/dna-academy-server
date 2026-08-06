import { MasterDataCodeDto } from '../../master-data-codes/dto/master-data-code.dto';

import { UserDto } from '../../users/dto/user.dto';

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

export class CreateStudentCareerInterestDto {
  @ApiProperty({
    required: false,
    type: () => String,
  })
  @IsOptional()
  @IsString()
  customInterest?: string | null;

  @ApiProperty({
    required: true,
    type: () => MasterDataCodeDto,
  })
  @ValidateNested()
  @Type(() => MasterDataCodeDto)
  @IsNotEmptyObject()
  careerInterest: MasterDataCodeDto;

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
