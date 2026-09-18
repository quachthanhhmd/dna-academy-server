import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, MinLength } from 'class-validator';

export class AuthResetPasswordDto {
  // Same floor as AuthRegisterLoginDto — otherwise a reset is a way round it.
  @ApiProperty()
  @IsNotEmpty()
  @MinLength(6)
  password: string;

  @ApiProperty()
  @IsNotEmpty()
  hash: string;
}
