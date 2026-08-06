import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class QuizQuestionDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  id: string;
}
