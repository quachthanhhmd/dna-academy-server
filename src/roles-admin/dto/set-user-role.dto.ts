import { ApiProperty } from '@nestjs/swagger';
import { IsInt } from 'class-validator';

export class SetUserRoleDto {
  @ApiProperty({ example: 4, description: 'The one role the user will hold.' })
  @IsInt()
  roleId: number;
}

class RoleRefDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  name: string;
}

export class RoleChangeResponseDto {
  @ApiProperty()
  userId: number;

  @ApiProperty({ type: () => RoleRefDto })
  role: RoleRefDto;

  @ApiProperty({
    required: false,
    description:
      'Present when the user has an instructor profile after the change.',
  })
  instructorId?: string;

  @ApiProperty({ description: 'True when this change created the profile.' })
  profileCreated: boolean;
}
