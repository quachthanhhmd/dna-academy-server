import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import { INSTRUCTOR_SORT_FIELDS } from '../../instructors/infrastructure/persistence/instructor.repository';

export class FindAllInstructorsDto {
  @ApiPropertyOptional({
    description: 'Case-insensitive substring match over fullName + headline.',
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  q?: string;

  @ApiPropertyOptional({ enum: ['active', 'inactive', 'all'], default: 'all' })
  @IsOptional()
  @IsIn(['active', 'inactive', 'all'])
  status?: 'active' | 'inactive' | 'all';

  @ApiPropertyOptional({
    description: 'master_data_code id within the expertise_area group.',
  })
  @IsOptional()
  @IsUUID()
  expertiseId?: string;

  @ApiPropertyOptional({
    enum: INSTRUCTOR_SORT_FIELDS,
    default: 'displayOrder',
  })
  @IsOptional()
  @IsIn(INSTRUCTOR_SORT_FIELDS as unknown as string[])
  sortBy?: string;

  @ApiPropertyOptional({ enum: ['asc', 'desc'], default: 'asc' })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc';

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;
}
