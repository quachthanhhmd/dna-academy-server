import { CareerReflectionQuestionsService } from '../career-reflection-questions/career-reflection-questions.service';
import { CareerReflectionQuestion } from '../career-reflection-questions/domain/career-reflection-question';

import { EnrollmentsService } from '../enrollments/enrollments.service';
import { Enrollment } from '../enrollments/domain/enrollment';

import {
  // common
  Injectable,
  HttpStatus,
  UnprocessableEntityException,
} from '@nestjs/common';
import { CreateCareerReflectionAnswerDto } from './dto/create-career-reflection-answer.dto';
import { UpdateCareerReflectionAnswerDto } from './dto/update-career-reflection-answer.dto';
import { CareerReflectionAnswerRepository } from './infrastructure/persistence/career-reflection-answer.repository';
import { IPaginationOptions } from '../utils/types/pagination-options';
import { CareerReflectionAnswer } from './domain/career-reflection-answer';

@Injectable()
export class CareerReflectionAnswersService {
  constructor(
    private readonly careerReflectionQuestionService: CareerReflectionQuestionsService,

    private readonly enrollmentService: EnrollmentsService,

    // Dependencies here
    private readonly careerReflectionAnswerRepository: CareerReflectionAnswerRepository,
  ) {}

  async create(
    createCareerReflectionAnswerDto: CreateCareerReflectionAnswerDto,
  ) {
    // Do not remove comment below.
    // <creating-property />

    const questionObject = await this.careerReflectionQuestionService.findById(
      createCareerReflectionAnswerDto.question.id,
    );
    if (!questionObject) {
      throw new UnprocessableEntityException({
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        errors: {
          question: 'notExists',
        },
      });
    }
    const question = questionObject;

    const enrollmentObject = await this.enrollmentService.findById(
      createCareerReflectionAnswerDto.enrollment.id,
    );
    if (!enrollmentObject) {
      throw new UnprocessableEntityException({
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        errors: {
          enrollment: 'notExists',
        },
      });
    }
    const enrollment = enrollmentObject;

    return this.careerReflectionAnswerRepository.create({
      // Do not remove comment below.
      // <creating-property-payload />
      submittedAt: createCareerReflectionAnswerDto.submittedAt,

      textAnswer: createCareerReflectionAnswerDto.textAnswer,

      ratingAnswer: createCareerReflectionAnswerDto.ratingAnswer,

      question,

      enrollment,
    });
  }

  findAllWithPagination({
    paginationOptions,
  }: {
    paginationOptions: IPaginationOptions;
  }) {
    return this.careerReflectionAnswerRepository.findAllWithPagination({
      paginationOptions: {
        page: paginationOptions.page,
        limit: paginationOptions.limit,
      },
    });
  }

  findById(id: CareerReflectionAnswer['id']) {
    return this.careerReflectionAnswerRepository.findById(id);
  }

  findByIds(ids: CareerReflectionAnswer['id'][]) {
    return this.careerReflectionAnswerRepository.findByIds(ids);
  }

  async update(
    id: CareerReflectionAnswer['id'],

    updateCareerReflectionAnswerDto: UpdateCareerReflectionAnswerDto,
  ) {
    // Do not remove comment below.
    // <updating-property />

    let question: CareerReflectionQuestion | undefined = undefined;

    if (updateCareerReflectionAnswerDto.question) {
      const questionObject =
        await this.careerReflectionQuestionService.findById(
          updateCareerReflectionAnswerDto.question.id,
        );
      if (!questionObject) {
        throw new UnprocessableEntityException({
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          errors: {
            question: 'notExists',
          },
        });
      }
      question = questionObject;
    }

    let enrollment: Enrollment | undefined = undefined;

    if (updateCareerReflectionAnswerDto.enrollment) {
      const enrollmentObject = await this.enrollmentService.findById(
        updateCareerReflectionAnswerDto.enrollment.id,
      );
      if (!enrollmentObject) {
        throw new UnprocessableEntityException({
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          errors: {
            enrollment: 'notExists',
          },
        });
      }
      enrollment = enrollmentObject;
    }

    return this.careerReflectionAnswerRepository.update(id, {
      // Do not remove comment below.
      // <updating-property-payload />
      submittedAt: updateCareerReflectionAnswerDto.submittedAt,

      textAnswer: updateCareerReflectionAnswerDto.textAnswer,

      ratingAnswer: updateCareerReflectionAnswerDto.ratingAnswer,

      question,

      enrollment,
    });
  }

  remove(id: CareerReflectionAnswer['id']) {
    return this.careerReflectionAnswerRepository.remove(id);
  }
}
