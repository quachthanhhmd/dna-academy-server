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
import { LecturesAdminService } from './lectures-admin.service';
import { PermissionGuard } from '../authorization/permission.guard';
import { RequirePermission } from '../authorization/require-permission.decorator';
import { CourseAccessGuard } from '../course-access/course-access.guard';
import { CourseAccess } from '../course-access/course-access.decorator';
import { MoveLectureDto } from './dto/move-lecture.dto';
import { Lecture } from '../lectures/domain/lecture';

@ApiTags('Admin / Courses')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), PermissionGuard, CourseAccessGuard)
@Controller({
  path: 'admin/courses/:courseId/lectures',
  version: '1',
})
export class LectureMoveAdminController {
  constructor(private readonly lecturesAdminService: LecturesAdminService) {}

  @ApiOperation({
    summary: 'Move a lecture to a different section within the same course',
  })
  @RequirePermission('courses', 'edit')
  @CourseAccess({ mode: 'edit', from: { course: 'courseId' } })
  @Patch(':id/move')
  @ApiParam({ name: 'courseId', type: String })
  @ApiParam({ name: 'id', type: String })
  @ApiOkResponse({ type: Lecture })
  @ApiNotFoundResponse()
  @ApiUnprocessableEntityResponse({
    description: 'targetSectionId does not belong to this course',
  })
  move(
    @Param('courseId') courseId: string,
    @Param('id') id: string,
    @Body() dto: MoveLectureDto,
  ) {
    return this.lecturesAdminService.move(
      courseId,
      id,
      dto.targetSectionId,
      dto.displayOrder,
    );
  }
}
