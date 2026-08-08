import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class FindPublicMasterDataCodesDto {
  @ApiPropertyOptional({
    description:
      'Filter by the owning group key, e.g. "education_stage" or "career_interest". Omit to return active codes across all groups.',
    example: 'education_stage',
  })
  @IsOptional()
  @IsString()
  groupKey?: string;
}
