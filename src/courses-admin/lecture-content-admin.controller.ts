import { Body, Controller, Param, Patch, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiBearerAuth,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { LectureContentAdminService } from './lecture-content-admin.service';
import { PermissionGuard } from '../authorization/permission.guard';
import { RequirePermission } from '../authorization/require-permission.decorator';
import { CourseAccessGuard } from '../course-access/course-access.guard';
import { CourseAccess } from '../course-access/course-access.decorator';
import { SaveLectureContentDto } from './dto/save-lecture-content.dto';

@ApiTags('Admin / Courses')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), PermissionGuard, CourseAccessGuard)
@Controller({
  path: 'admin/lectures/:id/content',
  version: '1',
})
export class LectureContentAdminController {
  constructor(
    private readonly lectureContentAdminService: LectureContentAdminService,
  ) {}

  @ApiOperation({
    summary: 'Save the type-specific content for a lecture',
    description:
      'Sets lecture.lectureType to the given value. If it differs from the ' +
      "lecture's previous type and prior content existed, that content is " +
      'deleted and the response includes incompatibleContentCleared: true.',
  })
  @RequirePermission('courses', 'edit')
  @CourseAccess({ mode: 'edit', from: { lecture: 'id' } })
  @Patch()
  @ApiParam({ name: 'id', type: String, description: 'Lecture id' })
  @ApiOkResponse()
  @ApiNotFoundResponse()
  @ApiUnprocessableEntityResponse({
    description:
      'Missing a field required for the given lectureType, or an invalid YouTube URL',
  })
  save(@Param('id') id: string, @Body() dto: SaveLectureContentDto) {
    return this.lectureContentAdminService.save(id, dto);
  }
}
