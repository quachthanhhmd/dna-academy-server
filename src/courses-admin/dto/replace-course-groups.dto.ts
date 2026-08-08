import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsUUID } from 'class-validator';

export class ReplaceCourseGroupsDto {
  @ApiProperty({
    type: [String],
    description:
      'master_data_code ids from the course_group group (active codes only).',
  })
  @IsArray()
  @IsUUID(undefined, { each: true })
  groupIds: string[];
}
