import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class UpdateInstructorStatusDto {
  @ApiProperty({
    description:
      'Deactivating keeps existing course assignments; it only blocks new ones.',
  })
  @IsBoolean()
  isActive: boolean;
}
