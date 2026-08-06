import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString } from 'class-validator';
import { Transform } from 'class-transformer';

export class FindAllMasterDataCodesDto {
  @ApiPropertyOptional({
    description:
      'Filter by the owning group key, e.g. "education_stage" or "career_interest".',
    example: 'education_stage',
  })
  @IsOptional()
  @IsString()
  groupKey?: string;

  @ApiPropertyOptional()
  @Transform(({ value }) => (value ? Number(value) : 1))
  @IsNumber()
  @IsOptional()
  page?: number;

  @ApiPropertyOptional()
  @Transform(({ value }) => (value ? Number(value) : 10))
  @IsNumber()
  @IsOptional()
  limit?: number;
}
