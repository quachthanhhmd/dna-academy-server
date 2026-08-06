import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class QuizAttemptDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  id: string;
}
