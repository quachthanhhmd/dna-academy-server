import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class MediaFileDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  id: string;
}
