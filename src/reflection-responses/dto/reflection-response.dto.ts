import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class ReflectionResponseDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  id: string;
}
