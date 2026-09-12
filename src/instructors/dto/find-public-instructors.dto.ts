import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class FindPublicInstructorsDto {
  @ApiPropertyOptional({
    description: 'Case-insensitive substring match over fullName + headline.',
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  q?: string;

  @ApiPropertyOptional({
    type: Boolean,
    default: true,
    description:
      'Restrict to instructors who teach at least one published course. ' +
      'Defaults to true so the catalog filter never offers a dead option.',
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'false' || value === false) return false;
    return true;
  })
  @IsBoolean()
  hasPublishedCourse?: boolean;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;
}
