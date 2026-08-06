import { MasterDataCode } from '../../master-data-codes/domain/master-data-code';

import { Course } from '../../courses/domain/course';

import { ApiProperty } from '@nestjs/swagger';

export class CourseGroupAssignment {
  @ApiProperty({
    type: () => MasterDataCode,
    nullable: false,
  })
  group: MasterDataCode;

  @ApiProperty({
    type: () => Course,
    nullable: false,
  })
  course: Course;

  @ApiProperty({
    type: String,
  })
  id: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
