import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class LectureContentArticleDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  id: string;
}
