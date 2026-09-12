import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional, ValidateIf } from 'class-validator';

export class LinkInstructorUserDto {
  @ApiProperty({
    type: Number,
    nullable: true,
    description: 'User id to link, or null to unlink.',
  })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsInt()
  userId: number | null;
}
