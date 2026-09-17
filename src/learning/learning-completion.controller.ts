import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { OnboardingGuard } from '../auth/guards/onboarding.guard';
import { PermissionGuard } from '../authorization/permission.guard';
import { RequirePermission } from '../authorization/require-permission.decorator';
import { ReflectionService } from './services/reflection.service';
import { CompletionService } from './services/completion.service';
import { CareerReflectionService } from './services/career-reflection.service';
import { CertificateGeneratorService } from './services/certificate-generator.service';
import { SubmitReflectionDto } from './dto/reflection.dto';
import {
  CertificateResponseDto,
  RatingDto,
  SubmitCareerReflectionDto,
  UpsertRatingDto,
} from './dto/completion.dto';

/** Epic 4 v2 §2.3 — reflection lecture, certificate, rating, career reflection. */
@ApiTags('Learning / Completion')
@Controller({ version: '1' })
export class LearningCompletionController {
  constructor(
    private readonly reflectionService: ReflectionService,
    private readonly completionService: CompletionService,
    private readonly certificateGenerator: CertificateGeneratorService,
    private readonly careerReflectionService: CareerReflectionService,
  ) {}

  @ApiOperation({ summary: 'Get reflection questions and saved answers' })
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), OnboardingGuard)
  @Get('lectures/:lectureId/reflection-responses')
  @ApiOkResponse()
  getReflection(@Param('lectureId') lectureId: string, @Request() request) {
    return this.reflectionService.getResponses(lectureId, request.user.id);
  }

  @ApiOperation({
    summary: 'Save or submit reflection answers',
    description:
      'isDraft=true saves whatever is typed. A final submit requires every ' +
      'question to meet minResponseLength (word count) and marks the lecture ' +
      'complete.',
  })
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), OnboardingGuard)
  @Post('lectures/:lectureId/reflection-responses')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse()
  submitReflection(
    @Param('lectureId') lectureId: string,
    @Body() dto: SubmitReflectionDto,
    @Request() request,
  ) {
    return this.reflectionService.submit(lectureId, request.user.id, {
      isDraft: dto.isDraft ?? false,
      answers: dto.answers,
    });
  }

  @ApiOperation({
    summary: 'Get the certificate for a completed enrollment',
    description:
      'Returns { ready: false } until the course is completed. V1 issues the ' +
      'number and snapshots; fileUrl is always null.',
  })
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), OnboardingGuard)
  @Get('enrollments/:id/certificate')
  @ApiOkResponse({ type: CertificateResponseDto })
  getCertificate(
    @Param('id') id: string,
    @Request() request,
  ): Promise<CertificateResponseDto> {
    return this.completionService.getCertificate(id, request.user.id);
  }

  @ApiOperation({
    summary: 'Re-issue the certificate for an enrollment (admin)',
    description:
      'Re-snapshots the student name, course title and completion date from ' +
      'the enrollment as it stands now. The certificate number never changes.',
  })
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), PermissionGuard)
  @RequirePermission('courses', 'edit')
  @Post('enrollments/:id/certificate/regenerate')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: CertificateResponseDto })
  regenerateCertificate(
    @Param('id') id: string,
  ): Promise<CertificateResponseDto> {
    // Same shape as the student-facing read, built in one place so the D6
    // root context cannot be present on one response and missing on the other.
    return this.completionService.regenerateCertificate(id);
  }

  @ApiOperation({ summary: 'Get my rating for this enrollment' })
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), OnboardingGuard)
  @Get('enrollments/:id/rating')
  @ApiOkResponse({ type: RatingDto })
  getRating(@Param('id') id: string, @Request() request) {
    return this.completionService.getRating(id, request.user.id);
  }

  @ApiOperation({
    summary: 'Create or update my rating',
    description:
      'Editable at any time after completion. Any review text sets ' +
      'reviewStatus=pending for moderation; a bare star rating is approved.',
  })
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), OnboardingGuard)
  @Post('enrollments/:id/rating')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: RatingDto })
  createRating(
    @Param('id') id: string,
    @Body() dto: UpsertRatingDto,
    @Request() request,
  ): Promise<RatingDto> {
    return this.completionService.upsertRating(id, request.user.id, dto);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), OnboardingGuard)
  @Put('enrollments/:id/rating')
  @ApiOkResponse({ type: RatingDto })
  updateRating(
    @Param('id') id: string,
    @Body() dto: UpsertRatingDto,
    @Request() request,
  ): Promise<RatingDto> {
    return this.completionService.upsertRating(id, request.user.id, dto);
  }

  @ApiOperation({
    summary: 'Career reflection questions for a course',
    description:
      "Epic 4.6. The course's own active questions plus the global ones " +
      '(courseId IS NULL), as one flat list ordered by displayOrder, localized ' +
      'by the request locale with a Vietnamese fallback. The path keeps ' +
      '"/grouped" for compatibility; the body is no longer grouped.',
  })
  @Get('career-reflection-questions/grouped')
  @ApiQuery({ name: 'courseId', type: String })
  @ApiOkResponse()
  careerQuestions(@Query('courseId') courseId: string) {
    return this.careerReflectionService.questionsForCourse(courseId);
  }

  @ApiOperation({
    summary: 'Save or update the career reflection',
    description:
      'Epic 4.6. Validates the whole form and reports every problem at once ' +
      'under errors.answers[questionId]. Re-submitting updates the existing ' +
      'answers (one row per question).',
  })
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), OnboardingGuard)
  @Post('enrollments/:id/career-reflection')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse()
  submitCareerReflection(
    @Param('id') id: string,
    @Body() dto: SubmitCareerReflectionDto,
    @Request() request,
  ) {
    return this.careerReflectionService.submit(
      id,
      request.user.id,
      dto.answers,
    );
  }

  @ApiOperation({
    summary: 'Questions and saved answers, for pre-filling the form',
  })
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), OnboardingGuard)
  @Get('enrollments/:id/career-reflection')
  @ApiOkResponse()
  getCareerReflection(@Param('id') id: string, @Request() request) {
    return this.careerReflectionService.getForEnrollment(id, request.user.id);
  }
}
