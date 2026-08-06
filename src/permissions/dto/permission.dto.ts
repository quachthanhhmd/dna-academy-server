import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class PermissionDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  id: string;
}
