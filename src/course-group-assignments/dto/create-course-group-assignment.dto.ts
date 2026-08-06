import { MasterDataCodeDto } from '../../master-data-codes/dto/master-data-code.dto';

import { CourseDto } from '../../courses/dto/course.dto';

import {
  // decorators here
  Type,
} from 'class-transformer';

import {
  // decorators here

  ValidateNested,
  IsNotEmptyObject,
} from 'class-validator';

import {
  // decorators here
  ApiProperty,
} from '@nestjs/swagger';

export class CreateCourseGroupAssignmentDto {
  @ApiProperty({
    required: true,
    type: () => MasterDataCodeDto,
  })
  @ValidateNested()
  @Type(() => MasterDataCodeDto)
  @IsNotEmptyObject()
  group: MasterDataCodeDto;

  @ApiProperty({
    required: true,
    type: () => CourseDto,
  })
  @ValidateNested()
  @Type(() => CourseDto)
  @IsNotEmptyObject()
  course: CourseDto;

  // Don't forget to use the class-validator decorators in the DTO properties.
}
