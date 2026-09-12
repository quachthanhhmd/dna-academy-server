import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Request,
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
import { CoursesAdminService } from './courses-admin.service';
import { CourseDetailService } from './course-detail.service';
import { CourseListsAdminService } from './course-lists-admin.service';
import { CourseGroupsAdminService } from './course-groups-admin.service';
import { CoursePublishAdminService } from './course-publish-admin.service';
import { PermissionGuard } from '../authorization/permission.guard';
import { RequirePermission } from '../authorization/require-permission.decorator';
import { CreateCourseAdminDto } from './dto/create-course-admin.dto';
import { UpdateCourseAdminDto } from './dto/update-course-admin.dto';
import { FindAllCoursesAdminDto } from './dto/find-all-courses-admin.dto';
import { ReplaceCourseListDto } from './dto/replace-course-list.dto';
import { ReplaceCourseGroupsDto } from './dto/replace-course-groups.dto';
import { Course } from '../courses/domain/course';
import {
  InfinityPaginationResponse,
  InfinityPaginationResponseDto,
} from '../utils/dto/infinity-pagination-response.dto';
import { infinityPagination } from '../utils/infinity-pagination';

@ApiTags('Admin / Courses')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), PermissionGuard)
@Controller({
  path: 'admin/courses',
  version: '1',
})
export class CoursesAdminController {
  constructor(
    private readonly coursesAdminService: CoursesAdminService,
    private readonly courseDetailService: CourseDetailService,
    private readonly courseListsAdminService: CourseListsAdminService,
    private readonly courseGroupsAdminService: CourseGroupsAdminService,
    private readonly coursePublishAdminService: CoursePublishAdminService,
  ) {}

  @ApiOperation({
    summary: 'Create a course (status=draft)',
    description:
      'courseId is a client-supplied business code and must be unique across all courses. Slug is auto-generated from the title (unique, suffixed -2/-3/... on collision). introVideoUrl, if given, is validated via the YouTube oEmbed API.',
  })
  @RequirePermission('courses', 'create')
  @Post()
  @ApiCreatedResponse({ type: Course })
  @ApiUnprocessableEntityResponse({
    description:
      'Duplicate courseId, invalid levelId/categoryId/instructorId, or introVideoUrl is not a valid YouTube video',
  })
  create(
    @Body() dto: CreateCourseAdminDto,
    @Request() request,
  ): Promise<Course> {
    return this.coursesAdminService.create(dto, request.user.id);
  }

  @ApiOperation({
    summary: 'List courses, filterable by status/level/category/instructor',
  })
  @RequirePermission('courses', 'view')
  @Get()
  @ApiOkResponse({ type: InfinityPaginationResponse(Course) })
  async findAll(
    @Query() query: FindAllCoursesAdminDto,
  ): Promise<InfinityPaginationResponseDto<Course>> {
    const page = query?.page ?? 1;
    let limit = query?.limit ?? 10;
    if (limit > 50) {
      limit = 50;
    }

    return infinityPagination(
      await this.coursesAdminService.findAllWithFilters(query),
      { page, limit },
    );
  }

  @ApiOperation({
    summary: 'Get full course detail, including nested sections/lectures',
  })
  @RequirePermission('courses', 'view')
  @Get(':id')
  @ApiParam({ name: 'id', type: String })
  @ApiNotFoundResponse()
  findOne(@Param('id') id: string) {
    return this.courseDetailService.findDetail(id);
  }

  @ApiOperation({ summary: 'Update course fields' })
  @RequirePermission('courses', 'edit')
  @Patch(':id')
  @ApiParam({ name: 'id', type: String })
  @ApiOkResponse({ type: Course })
  @ApiNotFoundResponse()
  @ApiUnprocessableEntityResponse({
    description:
      'Duplicate courseId, invalid levelId/categoryId/instructorId, or introVideoUrl is not a valid YouTube video',
  })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateCourseAdminDto,
  ): Promise<Course | null> {
    return this.coursesAdminService.update(id, dto);
  }

  @ApiOperation({ summary: 'Replace all learning outcomes for the course' })
  @RequirePermission('courses', 'edit')
  @Put(':id/outcomes')
  @ApiParam({ name: 'id', type: String })
  @ApiNotFoundResponse()
  replaceOutcomes(@Param('id') id: string, @Body() dto: ReplaceCourseListDto) {
    return this.courseListsAdminService.replaceOutcomes(id, dto.items);
  }

  @ApiOperation({ summary: 'Replace all requirements for the course' })
  @RequirePermission('courses', 'edit')
  @Put(':id/requirements')
  @ApiParam({ name: 'id', type: String })
  @ApiNotFoundResponse()
  replaceRequirements(
    @Param('id') id: string,
    @Body() dto: ReplaceCourseListDto,
  ) {
    return this.courseListsAdminService.replaceRequirements(id, dto.items);
  }

  @ApiOperation({ summary: 'Replace all target learners for the course' })
  @RequirePermission('courses', 'edit')
  @Put(':id/target-learners')
  @ApiParam({ name: 'id', type: String })
  @ApiNotFoundResponse()
  replaceTargetLearners(
    @Param('id') id: string,
    @Body() dto: ReplaceCourseListDto,
  ) {
    return this.courseListsAdminService.replaceTargetLearners(id, dto.items);
  }

  @ApiOperation({
    summary: 'Set the course_group assignments for the course',
    description:
      'Each id must be an active master_data_code under the course_group group.',
  })
  @RequirePermission('courses', 'edit')
  @Put(':id/groups')
  @ApiParam({ name: 'id', type: String })
  @ApiNotFoundResponse()
  @ApiUnprocessableEntityResponse({
    description: 'Unknown/inactive/wrong-group groupId',
  })
  replaceGroups(@Param('id') id: string, @Body() dto: ReplaceCourseGroupsDto) {
    return this.courseGroupsAdminService.replaceGroups(id, dto.groupIds);
  }

  @ApiOperation({
    summary: 'Publish a course',
    description:
      'Validates the publication checklist (title, shortDescription, ' +
      'thumbnailUrl, levelId, categoryId, at least 1 section with at least ' +
      "1 lecture, and every lecture's content saved). On success sets " +
      'status=published, publishedAt=now, publishedBy=req.user.id.',
  })
  @RequirePermission('courses', 'publish')
  @Post(':id/publish')
  @HttpCode(HttpStatus.OK)
  @ApiParam({ name: 'id', type: String })
  @ApiOkResponse({ type: Course })
  @ApiNotFoundResponse()
  @ApiUnprocessableEntityResponse({
    description: 'Publication checklist failed; response includes missingItems',
  })
  publish(@Param('id') id: string, @Request() request) {
    return this.coursePublishAdminService.publish(id, request.user.id);
  }

  @ApiOperation({
    summary: 'Unpublish a course',
    description:
      'Sets status=unpublished. Enrollment/progress records are untouched.',
  })
  @RequirePermission('courses', 'publish')
  @Post(':id/unpublish')
  @HttpCode(HttpStatus.OK)
  @ApiParam({ name: 'id', type: String })
  @ApiOkResponse({ type: Course })
  @ApiNotFoundResponse()
  unpublish(@Param('id') id: string) {
    return this.coursePublishAdminService.unpublish(id);
  }
}
