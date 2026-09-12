import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString } from 'class-validator';

export class FileUploadDto {
  @ApiProperty({ example: 'course-thumbnail.png' })
  @IsString()
  fileName: string;

  @ApiProperty({ example: 138723 })
  @IsNumber()
  fileSize: number;

  @ApiPropertyOptional({
    example: 'image/png',
    description:
      'Content-Type the client will send on the PUT request. It has to match this value, otherwise R2 rejects the upload.',
  })
  @IsOptional()
  @IsString()
  contentType?: string;
}
