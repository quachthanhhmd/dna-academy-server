import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
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
import { CreateLectureAdminDto } from './dto/create-lecture-admin.dto';
import { UpdateLectureAdminDto } from './dto/update-lecture-admin.dto';
import { ReorderItemsDto } from './dto/reorder-items.dto';
import { Lecture } from '../lectures/domain/lecture';

@ApiTags('Admin / Courses')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), PermissionGuard, CourseAccessGuard)
@Controller({
  path: 'admin/courses/:courseId/sections/:sectionId/lectures',
  version: '1',
})
export class LecturesAdminController {
  constructor(private readonly lecturesAdminService: LecturesAdminService) {}

  @ApiOperation({ summary: 'Create a lecture within a section' })
  @RequirePermission('courses', 'edit')
  @CourseAccess({ mode: 'edit', from: { course: 'courseId' } })
  @Post()
  @ApiParam({ name: 'courseId', type: String })
  @ApiParam({ name: 'sectionId', type: String })
  @ApiCreatedResponse({ type: Lecture })
  @ApiNotFoundResponse()
  create(
    @Param('courseId') courseId: string,
    @Param('sectionId') sectionId: string,
    @Body() dto: CreateLectureAdminDto,
  ) {
    return this.lecturesAdminService.create(courseId, sectionId, dto);
  }

  @ApiOperation({
    summary: 'Reorder lectures within a section',
    description:
      "orderedIds must be exactly the section's current lecture ids, in the desired order.",
  })
  @RequirePermission('courses', 'edit')
  @CourseAccess({ mode: 'edit', from: { course: 'courseId' } })
  @Patch('reorder')
  @ApiParam({ name: 'courseId', type: String })
  @ApiParam({ name: 'sectionId', type: String })
  @ApiOkResponse({ type: [Lecture] })
  @ApiNotFoundResponse()
  @ApiUnprocessableEntityResponse({
    description: "orderedIds does not match the section's current lectures",
  })
  reorder(
    @Param('courseId') courseId: string,
    @Param('sectionId') sectionId: string,
    @Body() dto: ReorderItemsDto,
  ) {
    return this.lecturesAdminService.reorder(
      courseId,
      sectionId,
      dto.orderedIds,
    );
  }

  @ApiOperation({ summary: 'Update a lecture' })
  @RequirePermission('courses', 'edit')
  @CourseAccess({ mode: 'edit', from: { course: 'courseId' } })
  @Patch(':id')
  @ApiParam({ name: 'courseId', type: String })
  @ApiParam({ name: 'sectionId', type: String })
  @ApiParam({ name: 'id', type: String })
  @ApiOkResponse({ type: Lecture })
  @ApiNotFoundResponse()
  update(
    @Param('courseId') courseId: string,
    @Param('sectionId') sectionId: string,
    @Param('id') id: string,
    @Body() dto: UpdateLectureAdminDto,
  ) {
    return this.lecturesAdminService.update(courseId, sectionId, id, dto);
  }

  @ApiOperation({ summary: 'Delete a lecture' })
  @RequirePermission('courses', 'delete')
  @CourseAccess({ mode: 'edit', from: { course: 'courseId' } })
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiParam({ name: 'courseId', type: String })
  @ApiParam({ name: 'sectionId', type: String })
  @ApiParam({ name: 'id', type: String })
  @ApiNotFoundResponse()
  remove(
    @Param('courseId') courseId: string,
    @Param('sectionId') sectionId: string,
    @Param('id') id: string,
  ) {
    return this.lecturesAdminService.remove(courseId, sectionId, id);
  }
}
