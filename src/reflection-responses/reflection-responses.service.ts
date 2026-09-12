import { ReflectionQuestionsService } from '../reflection-questions/reflection-questions.service';
import { ReflectionQuestion } from '../reflection-questions/domain/reflection-question';

import { EnrollmentsService } from '../enrollments/enrollments.service';
import { Enrollment } from '../enrollments/domain/enrollment';

import {
  // common
  Injectable,
  HttpStatus,
  UnprocessableEntityException,
} from '@nestjs/common';
import { CreateReflectionResponseDto } from './dto/create-reflection-response.dto';
import { UpdateReflectionResponseDto } from './dto/update-reflection-response.dto';
import { ReflectionResponseRepository } from './infrastructure/persistence/reflection-response.repository';
import { IPaginationOptions } from '../utils/types/pagination-options';
import { ReflectionResponse } from './domain/reflection-response';

@Injectable()
export class ReflectionResponsesService {
  constructor(
    private readonly reflectionQuestionService: ReflectionQuestionsService,

    private readonly enrollmentService: EnrollmentsService,

    // Dependencies here
    private readonly reflectionResponseRepository: ReflectionResponseRepository,
  ) {}

  async create(createReflectionResponseDto: CreateReflectionResponseDto) {
    // Do not remove comment below.
    // <creating-property />

    const questionObject = await this.reflectionQuestionService.findById(
      createReflectionResponseDto.question.id,
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
      createReflectionResponseDto.enrollment.id,
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

    return this.reflectionResponseRepository.create({
      // Do not remove comment below.
      // <creating-property-payload />
      submittedAt: createReflectionResponseDto.submittedAt,

      responseText: createReflectionResponseDto.responseText,

      question,

      enrollment,
    });
  }

  findAllWithPagination({
    paginationOptions,
  }: {
    paginationOptions: IPaginationOptions;
  }) {
    return this.reflectionResponseRepository.findAllWithPagination({
      paginationOptions: {
        page: paginationOptions.page,
        limit: paginationOptions.limit,
      },
    });
  }

  findById(id: ReflectionResponse['id']) {
    return this.reflectionResponseRepository.findById(id);
  }

  findByIds(ids: ReflectionResponse['id'][]) {
    return this.reflectionResponseRepository.findByIds(ids);
  }

  findByEnrollmentId(enrollmentId: string) {
    return this.reflectionResponseRepository.findByEnrollmentId(enrollmentId);
  }

  async update(
    id: ReflectionResponse['id'],

    updateReflectionResponseDto: UpdateReflectionResponseDto,
  ) {
    // Do not remove comment below.
    // <updating-property />

    let question: ReflectionQuestion | undefined = undefined;

    if (updateReflectionResponseDto.question) {
      const questionObject = await this.reflectionQuestionService.findById(
        updateReflectionResponseDto.question.id,
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

    if (updateReflectionResponseDto.enrollment) {
      const enrollmentObject = await this.enrollmentService.findById(
        updateReflectionResponseDto.enrollment.id,
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

    return this.reflectionResponseRepository.update(id, {
      // Do not remove comment below.
      // <updating-property-payload />
      submittedAt: updateReflectionResponseDto.submittedAt,

      responseText: updateReflectionResponseDto.responseText,

      question,

      enrollment,
    });
  }

  remove(id: ReflectionResponse['id']) {
    return this.reflectionResponseRepository.remove(id);
  }

  /** Epic 4.2 §3.2 — bulk clear for the admin progress reset. */
  removeByEnrollmentId(enrollmentId: string) {
    return this.reflectionResponseRepository.removeByEnrollmentId(enrollmentId);
  }
}
