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
} from 'class-validator';

import {
  // decorators here
  ApiProperty,
} from '@nestjs/swagger';

export class CreateOauthAccountDto {
  tokenExpiresAt?: Date | null;

  refreshToken?: string | null;

  accessToken?: string | null;

  @ApiProperty({
    required: true,
    type: () => String,
  })
  @IsString()
  providerUid: string;

  @ApiProperty({
    required: true,
    type: () => String,
  })
  @IsString()
  provider: string;

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
