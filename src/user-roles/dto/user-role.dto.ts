import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class UserRoleDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  id: string;
}
