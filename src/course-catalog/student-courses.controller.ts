import { Controller, Get, Query, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CourseEnrollmentService } from './course-enrollment.service';
import { MyCoursesResponseDto, StudentStatsDto } from './dto/my-course.dto';
import { FindMyCoursesDto } from './dto/find-my-courses.dto';

@ApiTags('Course Catalog')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller({
  path: 'students/me/courses',
  version: '1',
})
export class StudentCoursesController {
  constructor(
    private readonly courseEnrollmentService: CourseEnrollmentService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Courses the current student is enrolled in',
    description:
      'Epic 4.5 §1.2 — the My Learning dashboard.\n\n' +
      '**Returns an envelope, not a bare array.** `counts` always describes ' +
      'the unfiltered set so the tab counters stay correct while a filtered ' +
      'tab is active; `totalCount` describes the filtered set and drives ' +
      'pagination. The two are equal only when `status` is absent.\n\n' +
      'Ordering: in_progress by lastAccessedAt desc, then enrolled by ' +
      'enrollment date, then completed by completion date, then cancelled — ' +
      'tie-broken by enrollment id so paging cannot repeat or skip a row. ' +
      'The featured card is simply `data[0]`; the client does not re-sort.',
  })
  @ApiOkResponse({ type: MyCoursesResponseDto })
  findMyCourses(
    @Request() request,
    @Query() query: FindMyCoursesDto,
  ): Promise<MyCoursesResponseDto> {
    return this.courseEnrollmentService.findMyCourses(request.user.id, query);
  }
}

/**
 * Epic 4.5 §1.6 / BE-3 — mounted at `students/me`, not under `courses`.
 *
 * `StudentCoursesController` owns `students/me/courses`, so a `@Get('stats')`
 * there would answer at `students/me/courses/stats` — a path that reads as a
 * property of the course list rather than of the student.
 */
@ApiTags('Course Catalog')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller({
  path: 'students/me',
  version: '1',
})
export class StudentStatsController {
  constructor(
    private readonly courseEnrollmentService: CourseEnrollmentService,
  ) {}

  @Get('stats')
  @ApiOperation({
    summary: 'Learning momentum tiles for the current student',
    description:
      'Read-only aggregate over every enrollment; no paging, no params.\n\n' +
      '`lecturesCompleted` counts lectures, not modules — the design labels ' +
      'the tile "Modules Completed" but the number is lectures, so the API ' +
      'uses the honest name and the label stays a translation string.\n\n' +
      '`totalStudyHours` is summed from lecture durations, deliberately not ' +
      'from watch time, so the figure is deterministic.',
  })
  @ApiOkResponse({ type: StudentStatsDto })
  findMyStats(@Request() request): Promise<StudentStatsDto> {
    return this.courseEnrollmentService.findMyStats(request.user.id);
  }
}
