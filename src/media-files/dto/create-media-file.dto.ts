import { UserDto } from '../../users/dto/user.dto';

import {
  // decorators here

  IsString,
  IsOptional,
  IsNumber,
} from 'class-validator';

import {
  // decorators here
  ApiProperty,
} from '@nestjs/swagger';

export class CreateMediaFileDto {
  uploadedBy?: UserDto | null;

  @ApiProperty({
    required: true,
    type: () => String,
  })
  @IsString()
  status: string;

  @ApiProperty({
    required: false,
    type: () => Number,
  })
  @IsOptional()
  @IsNumber()
  sizeBytes?: number | null;

  @ApiProperty({
    required: false,
    type: () => String,
  })
  @IsOptional()
  @IsString()
  mimeType?: string | null;

  @ApiProperty({
    required: false,
    type: () => String,
  })
  @IsOptional()
  @IsString()
  fileName?: string | null;

  @ApiProperty({
    required: true,
    type: () => String,
  })
  @IsString()
  objectKey: string;

  @ApiProperty({
    required: true,
    type: () => String,
  })
  @IsString()
  bucket: string;

  // Don't forget to use the class-validator decorators in the DTO properties.
}
