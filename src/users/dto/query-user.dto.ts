import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Transform, Type, plainToInstance } from 'class-transformer';
import { RoleDto } from '../../roles/dto/role.dto';

export class FilterUserDto {
  @ApiPropertyOptional({ type: RoleDto })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => RoleDto)
  roles?: RoleDto[] | null;
}

/**
 * Columns a list may be ordered by. The key becomes a column name, so it is
 * whitelisted: ordering by `password` would leak an ordering of hashes.
 */
export const USER_SORT_FIELDS = [
  'id',
  'email',
  'firstName',
  'lastName',
  'fullName',
  'createdAt',
  'updatedAt',
] as const;

export class SortUserDto {
  @ApiProperty({ enum: USER_SORT_FIELDS })
  @Type(() => String)
  @IsString()
  @IsIn(USER_SORT_FIELDS)
  orderBy: (typeof USER_SORT_FIELDS)[number];

  @ApiProperty({ enum: ['ASC', 'DESC', 'asc', 'desc'] })
  @IsString()
  @IsIn(['ASC', 'DESC', 'asc', 'desc'])
  order: string;
}

export class QueryUserDto {
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

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @Transform(({ value }) =>
    value ? plainToInstance(FilterUserDto, JSON.parse(value)) : undefined,
  )
  @ValidateNested()
  @Type(() => FilterUserDto)
  filters?: FilterUserDto | null;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @Transform(({ value }) => {
    return value ? plainToInstance(SortUserDto, JSON.parse(value)) : undefined;
  })
  @ValidateNested({ each: true })
  @Type(() => SortUserDto)
  sort?: SortUserDto[] | null;
}
