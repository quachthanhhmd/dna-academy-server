import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class LectureContentVideoDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  id: string;
}
