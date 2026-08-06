import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class QuizAttemptAnswerDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  id: string;
}
