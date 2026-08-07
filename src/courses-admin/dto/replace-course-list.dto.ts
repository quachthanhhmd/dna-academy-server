import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsString,
  ValidateNested,
} from 'class-validator';

export class CourseListItemDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  description: string;

  @ApiProperty()
  @IsInt()
  displayOrder: number;
}

export class ReplaceCourseListDto {
  @ApiProperty({ type: [CourseListItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CourseListItemDto)
  items: CourseListItemDto[];
}
