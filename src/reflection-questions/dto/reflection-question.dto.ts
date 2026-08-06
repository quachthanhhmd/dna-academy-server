import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class ReflectionQuestionDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  id: string;
}
