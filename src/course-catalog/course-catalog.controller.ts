import {
  Controller,
  Get,
  Header,
  Headers,
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
  ApiHeader,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { OnboardingGuard } from '../auth/guards/onboarding.guard';
import {
  RateLimit,
  RateLimitGuard,
} from '../utils/rate-limit/rate-limit.guard';
import { CourseCatalogService } from './course-catalog.service';
import { CourseOverviewService } from './course-overview.service';
import { CourseEnrollmentService } from './course-enrollment.service';
import { FindCoursesCatalogDto } from './dto/find-courses-catalog.dto';
import { CourseCatalogResponseDto } from './dto/course-card.dto';
import { CourseOverviewDto } from './dto/course-overview.dto';
import { EnrollResponseDto } from './dto/my-course.dto';
import { optionalUserId } from '../utils/optional-user-id';

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
  @ApiBearerAuth()
  // Epic 4.4 §1.4 option A — public, but a valid JWT adds `isEnrolled` to each
  // card. Same pattern as the overview below.
  @UseGuards(AuthGuard(['jwt', 'anonymous']))
  // …which means the body now varies by caller. Without this header a shared
  // cache would happily serve one student's enrolled badges to another.
  @Header('Vary', 'Authorization')
  @ApiOperation({
    summary: 'Public course catalog',
    description:
      'Returns published courses with enrollment open. All query params are ' +
      'optional: OR within one filter, AND across filters, empty = no filter. ' +
      'Sending a JWT is optional and only adds `isEnrolled` per card.',
  })
  @ApiOkResponse({ type: CourseCatalogResponseDto })
  findAll(
    @Query() query: FindCoursesCatalogDto,
    @Request() request,
  ): Promise<CourseCatalogResponseDto> {
    return this.courseCatalogService.findCatalog(
      query,
      optionalUserId(request),
    );
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
  @UseGuards(AuthGuard('jwt'), OnboardingGuard, RateLimitGuard)
  // Epic 4 v2 §2.2 — enrolment is a cheap write a bored client could hammer.
  @RateLimit(5, 60_000)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Enroll the current student in a course',
    description:
      'Rate-limited to 5 calls a minute per user. Send an Idempotency-Key to ' +
      'make a retry return the existing enrollment instead of 409.',
  })
  @ApiParam({ name: 'slug', type: String, required: true })
  @ApiHeader({
    name: 'Idempotency-Key',
    required: false,
    description:
      'Any opaque string. With one set, an already-enrolled student gets the ' +
      'existing enrollmentId back rather than ALREADY_ENROLLED.',
  })
  @ApiCreatedResponse({ type: EnrollResponseDto })
  @ApiNotFoundResponse({ description: 'No published course with this slug' })
  @ApiForbiddenResponse({ description: '{ code: "ONBOARDING_REQUIRED" }' })
  @ApiConflictResponse({ description: '{ code: "ALREADY_ENROLLED" }' })
  @ApiTooManyRequestsResponse({ description: '{ code: "RATE_LIMITED" }' })
  @ApiUnprocessableEntityResponse({
    description: '{ errors: { course: "enrollmentClosed" } }',
  })
  enroll(
    @Param('slug') slug: string,
    @Request() request,
    @Headers('idempotency-key') idempotencyKey?: string,
  ): Promise<EnrollResponseDto> {
    return this.courseEnrollmentService.enroll(
      slug,
      request.user.id,
      idempotencyKey,
    );
  }
}
