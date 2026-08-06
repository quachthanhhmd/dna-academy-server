import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class RolePermissionDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  id: string;
}
