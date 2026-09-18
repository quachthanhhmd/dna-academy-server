import {
  ConflictException,
  HttpStatus,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { CoursesService } from '../courses/courses.service';
import { Course } from '../courses/domain/course';
import { IPaginationOptions } from '../utils/types/pagination-options';
import { FREE_TEXT_TYPE } from './career-reflection-question-types';
import { assertQuestionShape } from './career-reflection-shape';
import { CareerReflectionQuestion } from './domain/career-reflection-question';
import { CreateCareerReflectionQuestionDto } from './dto/create-career-reflection-question.dto';
import { UpdateCareerReflectionQuestionDto } from './dto/update-career-reflection-question.dto';
import { CareerReflectionQuestionRepository } from './infrastructure/persistence/career-reflection-question.repository';

@Injectable()
export class CareerReflectionQuestionsService {
  constructor(
    private readonly courseService: CoursesService,
    private readonly careerReflectionQuestionRepository: CareerReflectionQuestionRepository,
  ) {}

  /** `undefined` leaves the course untouched, `null` makes the row global. */
  private async resolveCourse(
    course: { id: Course['id'] } | null | undefined,
  ): Promise<Course | null | undefined> {
    if (course === undefined) {
      return undefined;
    }

    if (course === null) {
      return null;
    }

    const found = await this.courseService.findById(course.id);

    if (!found) {
      throw new UnprocessableEntityException({
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        errors: { course: 'notExists' },
      });
    }

    return found;
  }

  async create(dto: CreateCareerReflectionQuestionDto) {
    const course = await this.resolveCourse(dto.course);
    const shape = {
      questionType: dto.questionType,
      options: dto.options ?? null,
    };

    // Rejected here with a named field rather than as a raw CK_crq_shape
    // violation from Postgres.
    assertQuestionShape(shape);

    return this.careerReflectionQuestionRepository.create({
      questionType: shape.questionType,
      questionText: dto.questionText,
      questionTextTranslations: dto.questionTextTranslations ?? null,
      options: shape.options,
      isRequired: dto.isRequired ?? true,
      isActive: dto.isActive,
      displayOrder: dto.displayOrder,
      category: dto.category ?? null,
      course,
    });
  }

  findAllWithPagination({
    paginationOptions,
  }: {
    paginationOptions: IPaginationOptions;
  }) {
    return this.careerReflectionQuestionRepository.findAllWithPagination({
      paginationOptions: {
        page: paginationOptions.page,
        limit: paginationOptions.limit,
      },
    });
  }

  findById(id: CareerReflectionQuestion['id']) {
    return this.careerReflectionQuestionRepository.findById(id);
  }

  findByIds(ids: CareerReflectionQuestion['id'][]) {
    return this.careerReflectionQuestionRepository.findByIds(ids);
  }

  /** Active questions a course's form shows: its own plus the global ones. */
  findForCourse(courseId: string) {
    return this.careerReflectionQuestionRepository.findForCourse(courseId);
  }

  /** `GET /admin/career-reflection-questions`. */
  findForAdmin(filters: { courseId?: string; isActive?: boolean }) {
    return this.careerReflectionQuestionRepository.findForAdmin(filters);
  }

  private async findOrFail(
    id: CareerReflectionQuestion['id'],
  ): Promise<CareerReflectionQuestion> {
    const question = await this.careerReflectionQuestionRepository.findById(id);

    if (!question) {
      throw new NotFoundException({
        status: HttpStatus.NOT_FOUND,
        error: 'questionNotFound',
      });
    }

    return question;
  }

  /**
   * Hides a question from the form while keeping its answers. The safe way to
   * retire a question that has been answered.
   */
  async deactivate(id: CareerReflectionQuestion['id']) {
    await this.findOrFail(id);

    return this.careerReflectionQuestionRepository.update(id, {
      isActive: false,
    });
  }

  async update(
    id: CareerReflectionQuestion['id'],
    dto: UpdateCareerReflectionQuestionDto,
  ) {
    const current = await this.findOrFail(id);
    const course = await this.resolveCourse(dto.course);

    // The shape rule spans two fields, so a PATCH is validated against the row
    // it will produce, not against the patch alone: `questionType: 'selection'`
    // on its own would otherwise leave a selection with no options.
    const questionType = dto.questionType ?? current.questionType;
    const options =
      questionType === FREE_TEXT_TYPE
        ? null
        : dto.options !== undefined
          ? (dto.options ?? null)
          : (current.options ?? null);

    assertQuestionShape({ questionType, options });

    await this.assertAnswersSurvive(current, questionType, options);

    return this.careerReflectionQuestionRepository.update(id, {
      questionType,
      questionText: dto.questionText,
      questionTextTranslations: dto.questionTextTranslations,
      options,
      isRequired: dto.isRequired,
      isActive: dto.isActive,
      displayOrder: dto.displayOrder,
      category: dto.category,
      course,
    });
  }

  /**
   * An edit must not strand answers already given.
   *
   * Changing the type would leave `rating_answer` values under a free-text
   * question, or text under a selection. Removing an option key would leave
   * answers pointing at a choice that no longer exists, and every dashboard
   * count for that question would silently drop them. Relabelling an option
   * or reordering the array is fine — the key is what an answer stores.
   */
  private async assertAnswersSurvive(
    current: CareerReflectionQuestion,
    questionType: string,
    options: CareerReflectionQuestion['options'],
  ): Promise<void> {
    if (questionType !== current.questionType) {
      if (
        (await this.careerReflectionQuestionRepository.countAnswers(
          current.id,
        )) > 0
      ) {
        throw new ConflictException({
          status: HttpStatus.CONFLICT,
          errors: { questionType: 'questionHasAnswers' },
        });
      }

      return;
    }

    if (!options) {
      return;
    }

    const kept = new Set(options.map((option) => option.key));
    const stranded = (
      await this.careerReflectionQuestionRepository.answeredOptionKeys(
        current.id,
      )
    ).filter((key) => !kept.has(key));

    if (stranded.length > 0) {
      throw new ConflictException({
        status: HttpStatus.CONFLICT,
        errors: { options: `optionKeyInUse:${stranded.sort().join(',')}` },
      });
    }
  }

  /**
   * Epic 4.6 BE-6 — a hard delete, allowed only while nothing references the
   * row. It exists for the question created by mistake a minute ago; once a
   * student has answered, deleting would erase their response, so the caller
   * is sent to deactivate instead.
   */
  async remove(id: CareerReflectionQuestion['id']) {
    await this.findOrFail(id);

    if ((await this.careerReflectionQuestionRepository.countAnswers(id)) > 0) {
      throw new ConflictException({
        status: HttpStatus.CONFLICT,
        errors: { id: 'questionHasAnswers' },
      });
    }

    return this.careerReflectionQuestionRepository.remove(id);
  }
}
