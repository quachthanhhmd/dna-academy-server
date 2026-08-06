import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CourseRatingDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  id: string;
}
