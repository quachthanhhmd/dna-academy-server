import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import {
  CATALOG_SORTS,
  CatalogSort,
} from '../../courses/infrastructure/persistence/course.repository';
import { parseIdList } from '../../utils/parse-id-list';

/**
 * Shared decorator stack for the four plural id filters (Epic 4.4 §1.2).
 *
 * `whitelist: true` on the global ValidationPipe strips anything this class
 * does not declare — without a word and with a 200 — so an undeclared plural
 * param would look like it filtered and would not have.
 *
 * `@IsUUID()` with no version on purpose: the singular params it replaces are
 * unversioned too, and pinning '4' here would start rejecting ids the rest of
 * the API accepts.
 */
const idListProperty = (description: string) =>
  function decorate(target: object, propertyKey: string) {
    ApiPropertyOptional({
      type: String,
      description: `${description} Comma-separated, or repeat the param. OR within the set, AND with the other filters.`,
      example: '11111111-1111-4111-8111-111111111111,2222…',
    })(target, propertyKey);
    IsOptional()(target, propertyKey);
    IsArray()(target, propertyKey);
    IsUUID(undefined, { each: true })(target, propertyKey);
    Transform(({ value }) => parseIdList(value))(target, propertyKey);
  };

export class FindCoursesCatalogDto {
  @ApiPropertyOptional({
    type: String,
    description:
      'Full-text search over title / short description / full description, ' +
      'diacritic-insensitive (`khoa hoc` matches "Khoá học") with a prefix ' +
      'match on the final token. Instructor and category names are matched ' +
      'alongside it, unranked. Sent without `sortBy`, results come back ' +
      'relevance-ordered.',
    example: 'khoa hoc du lieu',
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  search?: string;

  @idListProperty('master_data_code ids within the course_group group.')
  groupIds?: string[];

  @idListProperty('master_data_code ids within the course_category group.')
  categoryIds?: string[];

  @idListProperty('master_data_code ids within the course_level group.')
  levelIds?: string[];

  @idListProperty('instructors.id — matches any role on the course.')
  instructorIds?: string[];

  // ---------------------------------------------------------------------
  // Deprecated singular aliases — §1.2. Kept for one release: the live
  // client, the header route and every bookmarked catalog URL send these
  // today, and `whitelist: true` would drop them in silence. Each is unioned
  // into its plural counterpart by the service.
  // ---------------------------------------------------------------------

  /** @deprecated use `groupIds` */
  @ApiPropertyOptional({
    type: String,
    deprecated: true,
    description: 'Deprecated — use `groupIds`. Unioned into it when both sent.',
  })
  @IsOptional()
  @IsUUID()
  groupId?: string;

  /** @deprecated use `categoryIds` */
  @ApiPropertyOptional({
    type: String,
    deprecated: true,
    description: 'Deprecated — use `categoryIds`.',
  })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  /** @deprecated use `levelIds` */
  @ApiPropertyOptional({
    type: String,
    deprecated: true,
    description: 'Deprecated — use `levelIds`.',
  })
  @IsOptional()
  @IsUUID()
  levelId?: string;

  /** @deprecated use `instructorIds` */
  @ApiPropertyOptional({
    type: String,
    deprecated: true,
    description: 'Deprecated — use `instructorIds`.',
  })
  @IsOptional()
  @IsUUID()
  instructorId?: string;

  @ApiPropertyOptional({ type: Number })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minPrice?: number;

  @ApiPropertyOptional({ type: Number })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxPrice?: number;

  @ApiPropertyOptional({ type: Boolean })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return value;
  })
  @IsBoolean()
  isFree?: boolean;

  @ApiPropertyOptional({ type: String, example: 'vi' })
  @IsOptional()
  @IsString()
  language?: string;

  @ApiPropertyOptional({ type: Number, example: 4 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minRating?: number;

  @ApiPropertyOptional({
    type: Number,
    description: 'Minimum total course duration, in seconds.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  minDurationSecs?: number;

  @ApiPropertyOptional({
    type: Number,
    description: 'Maximum total course duration, in seconds.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  maxDurationSecs?: number;

  @ApiPropertyOptional({ type: Boolean })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return value;
  })
  @IsBoolean()
  hasCertificate?: boolean;

  @ApiPropertyOptional({
    enum: CATALOG_SORTS,
    description:
      'Result ordering. Left unset it is `relevance` when `search` is ' +
      'present and `newest` otherwise — so do not send a default. ' +
      '`relevance` without a `search` term degrades to `newest`.',
  })
  @IsOptional()
  @IsIn(CATALOG_SORTS as unknown as string[])
  sortBy?: CatalogSort;

  @ApiPropertyOptional({ type: Number, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({
    type: Number,
    default: 12,
    description:
      'Capped at 50 server-side; a larger value is clamped, not rejected.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;
}
