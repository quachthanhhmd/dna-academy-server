import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class StudentProfileDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  id: string;
}
