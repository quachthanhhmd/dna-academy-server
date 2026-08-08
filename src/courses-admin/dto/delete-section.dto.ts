import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';

export class DeleteSectionDto {
  @ApiPropertyOptional({
    description:
      'Required (set to true) to cascade-delete a section that still has lectures.',
  })
  @IsOptional()
  @IsBoolean()
  force?: boolean;
}
