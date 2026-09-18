import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';
import { EXPORT_DATASETS, ExportDataset } from '../dashboard.constants';
import { DashboardQueryDto } from './dashboard-query.dto';

export const EXPORT_FORMATS = ['csv', 'pdf'] as const;

export type ExportFormat = (typeof EXPORT_FORMATS)[number];

/** Epic 7 BE-6/BE-7. */
export class ExportQueryDto extends DashboardQueryDto {
  @ApiProperty({ enum: EXPORT_FORMATS, default: 'csv' })
  @IsOptional()
  @IsIn(EXPORT_FORMATS)
  format?: ExportFormat;

  @ApiPropertyOptional({
    enum: EXPORT_DATASETS,
    default: 'overview',
    description:
      '`overview` is the whole dashboard and is PDF-only; every other value ' +
      'is the dataset of the endpoint with the same name.',
  })
  @IsOptional()
  @IsIn(EXPORT_DATASETS)
  dataset?: ExportDataset;
}
