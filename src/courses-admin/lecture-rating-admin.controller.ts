import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiBearerAuth,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { PermissionGuard } from '../authorization/permission.guard';
import { RequirePermission } from '../authorization/require-permission.decorator';
import { CourseAccessGuard } from '../course-access/course-access.guard';
import { CourseAccess } from '../course-access/course-access.decorator';
import { LectureContentAdminService } from './lecture-content-admin.service';

@ApiTags('Admin / Courses')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), PermissionGuard, CourseAccessGuard)
@Controller({
  path: 'admin/lectures/:id',
  version: '1',
})
export class LectureRatingAdminController {
  constructor(
    private readonly lectureContentAdminService: LectureContentAdminService,
  ) {}

  @ApiOperation({
    summary: "What learners answered a rating lesson, for the editor's results",
    description:
      'Count, mean (one decimal, null with no ratings), how many chose each ' +
      'value 1–5, and the 20 newest comments. Anonymous: no learner fields. ' +
      '422 when the lesson is not of type rating.',
  })
  @RequirePermission('courses', 'view')
  @CourseAccess({ mode: 'view', from: { lecture: 'id' } })
  @Get('rating-summary')
  @ApiParam({ name: 'id', type: String, description: 'Lecture id' })
  @ApiOkResponse()
  @ApiNotFoundResponse()
  ratingSummary(@Param('id') id: string) {
    return this.lectureContentAdminService.ratingSummary(id);
  }
}
