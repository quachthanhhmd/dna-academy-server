import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class SurveyAnswerDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  id: string;
}
