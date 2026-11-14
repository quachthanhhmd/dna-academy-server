import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class SurveyQuestionOptionDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  id: string;
}
