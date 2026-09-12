import { CoursesService } from '../courses/courses.service';
import { Course } from '../courses/domain/course';

import {
  // common
  Injectable,
  HttpStatus,
  UnprocessableEntityException,
} from '@nestjs/common';
import { CreateCareerReflectionQuestionDto } from './dto/create-career-reflection-question.dto';
import { UpdateCareerReflectionQuestionDto } from './dto/update-career-reflection-question.dto';
import { CareerReflectionQuestionRepository } from './infrastructure/persistence/career-reflection-question.repository';
import { IPaginationOptions } from '../utils/types/pagination-options';
import { CareerReflectionQuestion } from './domain/career-reflection-question';
import { assertQuestionShape } from './career-reflection-shape';
import { SLIDER_TYPE } from './career-reflection-question-types';

@Injectable()
export class CareerReflectionQuestionsService {
  constructor(
    private readonly courseService: CoursesService,

    // Dependencies here
    private readonly careerReflectionQuestionRepository: CareerReflectionQuestionRepository,
  ) {}

  async create(
    createCareerReflectionQuestionDto: CreateCareerReflectionQuestionDto,
  ) {
    // Do not remove comment below.
    // <creating-property />

    let course: Course | null | undefined = undefined;

    if (createCareerReflectionQuestionDto.course) {
      const courseObject = await this.courseService.findById(
        createCareerReflectionQuestionDto.course.id,
      );
      if (!courseObject) {
        throw new UnprocessableEntityException({
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          errors: {
            course: 'notExists',
          },
        });
      }
      course = courseObject;
    } else if (createCareerReflectionQuestionDto.course === null) {
      course = null;
    }

    const shape = {
      questionType:
        createCareerReflectionQuestionDto.questionType ?? SLIDER_TYPE,
      options: createCareerReflectionQuestionDto.options ?? null,
    };

    // Rejected here with a named field rather than as a raw CK_crq_shape
    // violation from Postgres.
    assertQuestionShape(shape);

    return this.careerReflectionQuestionRepository.create({
      // Do not remove comment below.
      // <creating-property-payload />
      isActive: createCareerReflectionQuestionDto.isActive,

      displayOrder: createCareerReflectionQuestionDto.displayOrder,

      questionText: createCareerReflectionQuestionDto.questionText,

      // Epic 4.1 §3.1 — existing rows are sliders, which is what the form drew
      // before it became data-driven, so an omitted type means slider.
      questionType: shape.questionType,

      labelMin: createCareerReflectionQuestionDto.labelMin ?? null,

      labelMax: createCareerReflectionQuestionDto.labelMax ?? null,

      labelMinTranslations:
        createCareerReflectionQuestionDto.labelMinTranslations ?? null,

      labelMaxTranslations:
        createCareerReflectionQuestionDto.labelMaxTranslations ?? null,

      options: shape.options,

      // Epic 4 v2 §2.1 — drives the grouping of the post-completion form.
      category: createCareerReflectionQuestionDto.category ?? null,

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

  findForCourse(courseId: string) {
    return this.careerReflectionQuestionRepository.findForCourse(courseId);
  }

  /** Epic 4.1 §3.2 — `GET /admin/career-reflection-questions`. */
  findForAdmin(filters: { courseId?: string; isActive?: boolean }) {
    return this.careerReflectionQuestionRepository.findForAdmin(filters);
  }

  /**
   * Epic 4.1 §3.2 — no hard delete. Answers reference these rows, so removing
   * one would orphan the data the `category` aggregates are built from; the
   * same deactivate-instead-of-delete rule master data uses (Epic 2 §5).
   */
  deactivate(id: CareerReflectionQuestion['id']) {
    return this.careerReflectionQuestionRepository.update(id, {
      isActive: false,
    });
  }

  async update(
    id: CareerReflectionQuestion['id'],

    updateCareerReflectionQuestionDto: UpdateCareerReflectionQuestionDto,
  ) {
    // Do not remove comment below.
    // <updating-property />

    let course: Course | null | undefined = undefined;

    if (updateCareerReflectionQuestionDto.course) {
      const courseObject = await this.courseService.findById(
        updateCareerReflectionQuestionDto.course.id,
      );
      if (!courseObject) {
        throw new UnprocessableEntityException({
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          errors: {
            course: 'notExists',
          },
        });
      }
      course = courseObject;
    } else if (updateCareerReflectionQuestionDto.course === null) {
      course = null;
    }

    // The shape rule spans two fields, so a PATCH has to be validated against
    // the row it will produce, not against the patch alone: sending only
    // `questionType: 'radio'` would otherwise leave a radio with no options.
    const current = await this.careerReflectionQuestionRepository.findById(id);

    if (!current) {
      throw new UnprocessableEntityException({
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        errors: { id: 'notExists' },
      });
    }

    const questionType =
      updateCareerReflectionQuestionDto.questionType ??
      current.questionType ??
      SLIDER_TYPE;
    const options =
      updateCareerReflectionQuestionDto.options !== undefined
        ? (updateCareerReflectionQuestionDto.options ?? null)
        : (current.options ?? null);
    // Switching to a slider drops the options it may no longer hold; switching
    // away from one drops the end labels. Otherwise the merged row fails the
    // DB CHECK on a patch that looked perfectly reasonable.
    const merged =
      questionType === SLIDER_TYPE
        ? { questionType, options: null }
        : { questionType, options };

    assertQuestionShape(merged);

    return this.careerReflectionQuestionRepository.update(id, {
      // Do not remove comment below.
      // <updating-property-payload />
      isActive: updateCareerReflectionQuestionDto.isActive,

      displayOrder: updateCareerReflectionQuestionDto.displayOrder,

      questionText: updateCareerReflectionQuestionDto.questionText,

      questionType: merged.questionType,

      labelMin:
        questionType === SLIDER_TYPE
          ? updateCareerReflectionQuestionDto.labelMin
          : null,

      labelMax:
        questionType === SLIDER_TYPE
          ? updateCareerReflectionQuestionDto.labelMax
          : null,

      labelMinTranslations:
        questionType === SLIDER_TYPE
          ? updateCareerReflectionQuestionDto.labelMinTranslations
          : null,

      labelMaxTranslations:
        questionType === SLIDER_TYPE
          ? updateCareerReflectionQuestionDto.labelMaxTranslations
          : null,

      options: merged.options,

      category: updateCareerReflectionQuestionDto.category,

      course,
    });
  }

  remove(id: CareerReflectionQuestion['id']) {
    return this.careerReflectionQuestionRepository.remove(id);
  }
}
