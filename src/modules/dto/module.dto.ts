import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class ModuleDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  id: string;
}
