import { Controller, Get, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { InstructorsService } from './instructors.service';
import { FindPublicInstructorsDto } from './dto/find-public-instructors.dto';
import {
  InstructorRefDto,
  toInstructorRef,
} from './dto/instructor-profile.dto';

export const PUBLIC_INSTRUCTORS_MAX_LIMIT = 100;

@ApiTags('Instructors')
@Controller({
  path: 'instructors',
  version: '1',
})
export class InstructorsPublicController {
  constructor(private readonly instructorsService: InstructorsService) {}

  @ApiOperation({
    summary: 'Public: active instructors, for the catalog filter (no auth)',
    description:
      'Compact projection only. Epic 5 §3.3 points STU_CAT_03 at the admin ' +
      'endpoint, but that one is permission-guarded and a guest cannot call ' +
      'it — this is the public equivalent. Deactivated instructors are never ' +
      'returned, and by default neither are instructors without a published ' +
      'course.',
  })
  @Get()
  @ApiOkResponse({ type: [InstructorRefDto] })
  async findAll(
    @Query() query: FindPublicInstructorsDto,
  ): Promise<InstructorRefDto[]> {
    const { data } = await this.instructorsService.findAllWithPagination({
      filterOptions: {
        search: query.q || undefined,
        isActive: true,
        hasPublishedCourse: query.hasPublishedCourse ?? true,
      },
      sortOptions: { field: 'fullName', order: 'ASC' },
      paginationOptions: {
        page: query.page ?? 1,
        limit: Math.min(query.limit ?? 50, PUBLIC_INSTRUCTORS_MAX_LIMIT),
      },
    });

    return data.map((instructor) => toInstructorRef(instructor));
  }
}
