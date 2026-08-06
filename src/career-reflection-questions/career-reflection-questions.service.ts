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

    return this.careerReflectionQuestionRepository.create({
      // Do not remove comment below.
      // <creating-property-payload />
      isActive: createCareerReflectionQuestionDto.isActive,

      displayOrder: createCareerReflectionQuestionDto.displayOrder,

      questionText: createCareerReflectionQuestionDto.questionText,

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

    return this.careerReflectionQuestionRepository.update(id, {
      // Do not remove comment below.
      // <updating-property-payload />
      isActive: updateCareerReflectionQuestionDto.isActive,

      displayOrder: updateCareerReflectionQuestionDto.displayOrder,

      questionText: updateCareerReflectionQuestionDto.questionText,

      course,
    });
  }

  remove(id: CareerReflectionQuestion['id']) {
    return this.careerReflectionQuestionRepository.remove(id);
  }
}
