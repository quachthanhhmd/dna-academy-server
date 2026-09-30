import { UserDto } from '../../users/dto/user.dto';

import {
  // decorators here

  IsString,
  IsOptional,
  IsNumber,
  IsEnum,
} from 'class-validator';
import { FileVisibility } from '../../files/storage/file-purpose';

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

  @ApiProperty({
    required: true,
    enum: FileVisibility,
  })
  @IsEnum(FileVisibility)
  visibility: FileVisibility;

  @ApiProperty({
    required: false,
    type: () => String,
  })
  @IsOptional()
  @IsString()
  purpose?: string | null;

  // Don't forget to use the class-validator decorators in the DTO properties.
}
