import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class LectureProgressDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  id: string;
}
