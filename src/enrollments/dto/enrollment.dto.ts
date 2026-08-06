import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class EnrollmentDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  id: string;
}
