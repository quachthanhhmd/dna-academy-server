import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
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
@UseGuards(AuthGuard('jwt'), PermissionGuard)
@Controller({ path: 'admin/career-reflection-questions', version: '1' })
export class CareerReflectionQuestionsAdminController {
  constructor(private readonly service: CareerReflectionQuestionsService) {}

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
  findAll(
    @Query() query: FindCareerQuestionsAdminDto,
  ): Promise<CareerReflectionQuestion[]> {
    return this.service.findForAdmin({
      courseId: query.courseId,
      isActive:
        query.isActive === undefined ? undefined : query.isActive === 'true',
    });
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
  @Patch(':id')
  @ApiOkResponse({ type: CareerReflectionQuestion })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateCareerReflectionQuestionDto,
  ): Promise<CareerReflectionQuestion | null> {
    return this.service.update(id, dto);
  }

  @ApiOperation({
    summary: 'Deactivate a question',
    description:
      'Hides the question from the form and keeps its answers. The way to ' +
      'retire a question that has been answered.',
  })
  @RequirePermission('courses', 'edit')
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
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  @ApiConflictResponse()
  remove(@Param('id') id: string): Promise<void> {
    return this.service.remove(id);
  }
}
