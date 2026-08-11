import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { OnboardingGuard } from '../auth/guards/onboarding.guard';
import { CourseCatalogService } from './course-catalog.service';
import { CourseOverviewService } from './course-overview.service';
import { CourseEnrollmentService } from './course-enrollment.service';
import { FindCoursesCatalogDto } from './dto/find-courses-catalog.dto';
import { CourseCatalogResponseDto } from './dto/course-card.dto';
import { CourseOverviewDto } from './dto/course-overview.dto';
import { EnrollResponseDto } from './dto/my-course.dto';
import { optionalUserId } from './optional-user-id';

@ApiTags('Course Catalog')
@Controller({
  path: 'courses',
  version: '1',
})
export class CourseCatalogController {
  constructor(
    private readonly courseCatalogService: CourseCatalogService,
    private readonly courseOverviewService: CourseOverviewService,
    private readonly courseEnrollmentService: CourseEnrollmentService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Public course catalog',
    description:
      'Returns published courses with enrollment open. All query params are optional and combine with AND logic.',
  })
  @ApiOkResponse({ type: CourseCatalogResponseDto })
  findAll(
    @Query() query: FindCoursesCatalogDto,
  ): Promise<CourseCatalogResponseDto> {
    return this.courseCatalogService.findCatalog(query);
  }

  @Get(':slug')
  @ApiBearerAuth()
  @UseGuards(AuthGuard(['jwt', 'anonymous']))
  @ApiOperation({
    summary: 'Course overview',
    description:
      'Public detail for a published course. When a valid JWT is supplied, the caller enrollment state is attached.',
  })
  @ApiParam({ name: 'slug', type: String, required: true })
  @ApiOkResponse({ type: CourseOverviewDto })
  @ApiNotFoundResponse({ description: 'No published course with this slug' })
  findBySlug(
    @Param('slug') slug: string,
    @Request() request,
  ): Promise<CourseOverviewDto> {
    return this.courseOverviewService.findPublishedBySlug(
      slug,
      optionalUserId(request),
    );
  }

  @Post(':slug/enroll')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), OnboardingGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Enroll the current student in a course' })
  @ApiParam({ name: 'slug', type: String, required: true })
  @ApiCreatedResponse({ type: EnrollResponseDto })
  @ApiNotFoundResponse({ description: 'No published course with this slug' })
  @ApiForbiddenResponse({ description: '{ code: "ONBOARDING_REQUIRED" }' })
  @ApiConflictResponse({ description: '{ code: "ALREADY_ENROLLED" }' })
  @ApiUnprocessableEntityResponse({
    description: '{ errors: { course: "enrollmentClosed" } }',
  })
  enroll(
    @Param('slug') slug: string,
    @Request() request,
  ): Promise<EnrollResponseDto> {
    return this.courseEnrollmentService.enroll(slug, request.user.id);
  }
}
