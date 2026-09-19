import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Transform } from 'class-transformer';
import { IsBooleanString, IsOptional, IsUUID } from 'class-validator';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { PermissionGuard } from '../authorization/permission.guard';
import { RequirePermission } from '../authorization/require-permission.decorator';
import { CourseAccessGuard } from '../course-access/course-access.guard';
import { CourseAccess } from '../course-access/course-access.decorator';
import { CourseAccessService } from '../course-access/course-access.service';
import { CareerReflectionQuestionsService } from './career-reflection-questions.service';
import { CareerReflectionQuestion } from './domain/career-reflection-question';
import { CreateCareerReflectionQuestionDto } from './dto/create-career-reflection-question.dto';
import { UpdateCareerReflectionQuestionDto } from './dto/update-career-reflection-question.dto';

export class FindCareerQuestionsAdminDto {
  @IsOptional()
  @IsUUID()
  courseId?: string;

  @IsOptional()
  @IsBooleanString()
  @Transform(({ value }) => value)
  isActive?: string;
}

/**
 * Epic 4.1 D5 / §3.2 — `ADM_CRQ_20`.
 *
 * Making the post-completion form data-driven means somebody has to author the
 * question text, type, options, labels and category. The only way in before
 * this was the generated CRUD at `/career-reflection-questions`, which v2.3
 * §4.14 tells the FE not to build against — so the data-driven form had no
 * supported authoring path at all.
 */
@ApiTags('Admin / Career Reflection Questions')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), PermissionGuard, CourseAccessGuard)
@Controller({ path: 'admin/career-reflection-questions', version: '1' })
export class CareerReflectionQuestionsAdminController {
  constructor(
    private readonly service: CareerReflectionQuestionsService,
    private readonly courseAccessService: CourseAccessService,
  ) {}

  @ApiOperation({
    summary: 'List questions for authoring',
    description:
      'Unlike the public read this shows inactive questions too, and does ' +
      'not fold in the global ones unless courseId is omitted.',
  })
  @RequirePermission('courses', 'view')
  @Get()
  @ApiQuery({ name: 'courseId', type: String, required: false })
  @ApiQuery({ name: 'isActive', type: Boolean, required: false })
  async findAll(
    @Query() query: FindCareerQuestionsAdminDto,
    @Request() request,
  ): Promise<CareerReflectionQuestion[]> {
    const userId: number = request.user.id;

    if (query.courseId) {
      await this.courseAccessService.assertCanView(userId, query.courseId);
    }

    const questions = await this.service.findForAdmin({
      courseId: query.courseId,
      isActive:
        query.isActive === undefined ? undefined : query.isActive === 'true',
    });

    // Without courses:edit_any: global questions and the caller's courses.
    const scope = await this.courseAccessService.scopeOf(userId);
    if (scope.all) {
      return questions;
    }
    const taught = new Set(scope.courseIds);
    return questions.filter(
      (question) => !question.course || taught.has(question.course.id),
    );
  }

  @ApiOperation({
    summary: 'Create a question',
    description:
      'Omit `course` for a global question shown on every course. A ' +
      '`selection` takes 2–7 options; a `free_text` takes none.',
  })
  @RequirePermission('courses', 'create')
  @Post()
  @ApiCreatedResponse({ type: CareerReflectionQuestion })
  create(
    @Body() dto: CreateCareerReflectionQuestionDto,
  ): Promise<CareerReflectionQuestion> {
    return this.service.create(dto);
  }

  @ApiOperation({
    summary: 'Update a question',
    description:
      '409 if the patch would strand existing answers: changing questionType ' +
      'on an answered question, or removing an option key that has answers. ' +
      'Relabelling and reordering options is always allowed.',
  })
  @ApiConflictResponse()
  @RequirePermission('courses', 'edit')
  @CourseAccess({ mode: 'edit', from: { careerQuestion: 'id' } })
  @Patch(':id')
  @ApiOkResponse({ type: CareerReflectionQuestion })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateCareerReflectionQuestionDto,
    @Request() request,
  ): Promise<CareerReflectionQuestion | null> {
    // Moving the question is a write to the course it lands on as well;
    // making it global puts it on every course.
    if (dto.course !== undefined) {
      if (dto.course === null) {
        if (!(await this.courseAccessService.canEditAny(request.user.id))) {
          throw new ForbiddenException({
            code: 'PERMISSION_DENIED',
            required: { module: 'courses', action: 'edit_any' },
          });
        }
      } else {
        await this.courseAccessService.assertCanEdit(
          request.user.id,
          dto.course.id,
        );
      }
    }

    return this.service.update(id, dto);
  }

  @ApiOperation({
    summary: 'Deactivate a question',
    description:
      'Hides the question from the form and keeps its answers. The way to ' +
      'retire a question that has been answered.',
  })
  @RequirePermission('courses', 'edit')
  @CourseAccess({ mode: 'edit', from: { careerQuestion: 'id' } })
  @Patch(':id/deactivate')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: CareerReflectionQuestion })
  deactivate(
    @Param('id') id: string,
  ): Promise<CareerReflectionQuestion | null> {
    return this.service.deactivate(id);
  }

  @ApiOperation({
    summary: 'Delete a question',
    description:
      'Hard delete, only while no answer references it — for undoing a ' +
      'question created by mistake. An answered question returns 409 ' +
      '`questionHasAnswers`; deactivate it instead.',
  })
  @RequirePermission('courses', 'delete')
  @CourseAccess({ mode: 'edit', from: { careerQuestion: 'id' } })
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  @ApiConflictResponse()
  remove(@Param('id') id: string): Promise<void> {
    return this.service.remove(id);
  }
}
