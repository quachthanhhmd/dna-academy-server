import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class LectureRatingResponseDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  id: string;
}
