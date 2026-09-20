import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Param,
  Patch,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiBearerAuth,
  ApiNoContentResponse,
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
    summary: "Read a lecture's saved content, for the editor",
    description:
      'Returns exactly the body PATCH accepts, discriminated by lectureType, ' +
      'so the editor can reopen a lecture saved in an earlier session. ' +
      '204 when the lecture has no content yet. Quiz options include ' +
      '`isCorrect` — this route is admin-only.',
  })
  @RequirePermission('courses', 'view')
  @CourseAccess({ mode: 'edit', from: { lecture: 'id' } })
  @Get()
  @ApiParam({ name: 'id', type: String, description: 'Lecture id' })
  @ApiOkResponse({ type: SaveLectureContentDto })
  @ApiNoContentResponse({ description: 'The lecture has no content yet' })
  @ApiNotFoundResponse()
  async find(
    @Param('id') id: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    const content = await this.lectureContentAdminService.findContent(id);

    if (!content) {
      // An empty editor is the correct state here, and 204 says so without
      // the client having to treat an empty object as a special case.
      response.status(HttpStatus.NO_CONTENT);

      return undefined;
    }

    return content;
  }

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
