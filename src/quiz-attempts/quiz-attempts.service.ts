import { LecturesService } from '../lectures/lectures.service';
import { Lecture } from '../lectures/domain/lecture';

import { EnrollmentsService } from '../enrollments/enrollments.service';
import { Enrollment } from '../enrollments/domain/enrollment';

import {
  // common
  Injectable,
  HttpStatus,
  UnprocessableEntityException,
} from '@nestjs/common';
import { CreateQuizAttemptDto } from './dto/create-quiz-attempt.dto';
import { UpdateQuizAttemptDto } from './dto/update-quiz-attempt.dto';
import { QuizAttemptRepository } from './infrastructure/persistence/quiz-attempt.repository';
import { IPaginationOptions } from '../utils/types/pagination-options';
import { QuizAttempt } from './domain/quiz-attempt';

@Injectable()
export class QuizAttemptsService {
  constructor(
    private readonly lectureService: LecturesService,

    private readonly enrollmentService: EnrollmentsService,

    // Dependencies here
    private readonly quizAttemptRepository: QuizAttemptRepository,
  ) {}

  async create(createQuizAttemptDto: CreateQuizAttemptDto) {
    // Do not remove comment below.
    // <creating-property />

    const lectureObject = await this.lectureService.findById(
      createQuizAttemptDto.lecture.id,
    );
    if (!lectureObject) {
      throw new UnprocessableEntityException({
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        errors: {
          lecture: 'notExists',
        },
      });
    }
    const lecture = lectureObject;

    const enrollmentObject = await this.enrollmentService.findById(
      createQuizAttemptDto.enrollment.id,
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

    return this.quizAttemptRepository.create({
      // Do not remove comment below.
      // <creating-property-payload />
      submittedAt: createQuizAttemptDto.submittedAt,

      passed: createQuizAttemptDto.passed,

      score: createQuizAttemptDto.score,

      lecture,

      enrollment,
    });
  }

  findAllWithPagination({
    paginationOptions,
  }: {
    paginationOptions: IPaginationOptions;
  }) {
    return this.quizAttemptRepository.findAllWithPagination({
      paginationOptions: {
        page: paginationOptions.page,
        limit: paginationOptions.limit,
      },
    });
  }

  findById(id: QuizAttempt['id']) {
    return this.quizAttemptRepository.findById(id);
  }

  findByIds(ids: QuizAttempt['id'][]) {
    return this.quizAttemptRepository.findByIds(ids);
  }

  findByEnrollmentAndLecture(enrollmentId: string, lectureId: string) {
    return this.quizAttemptRepository.findByEnrollmentAndLecture(
      enrollmentId,
      lectureId,
    );
  }

  /** Epic 4.5 §1.5 — submitted attempts for a whole dashboard page. */
  findSubmittedByEnrollmentIds(enrollmentIds: string[]) {
    return this.quizAttemptRepository.findSubmittedByEnrollmentIds(
      enrollmentIds,
    );
  }

  async update(
    id: QuizAttempt['id'],

    updateQuizAttemptDto: UpdateQuizAttemptDto,
  ) {
    // Do not remove comment below.
    // <updating-property />

    let lecture: Lecture | undefined = undefined;

    if (updateQuizAttemptDto.lecture) {
      const lectureObject = await this.lectureService.findById(
        updateQuizAttemptDto.lecture.id,
      );
      if (!lectureObject) {
        throw new UnprocessableEntityException({
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          errors: {
            lecture: 'notExists',
          },
        });
      }
      lecture = lectureObject;
    }

    let enrollment: Enrollment | undefined = undefined;

    if (updateQuizAttemptDto.enrollment) {
      const enrollmentObject = await this.enrollmentService.findById(
        updateQuizAttemptDto.enrollment.id,
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

    return this.quizAttemptRepository.update(id, {
      // Do not remove comment below.
      // <updating-property-payload />
      submittedAt: updateQuizAttemptDto.submittedAt,

      passed: updateQuizAttemptDto.passed,

      score: updateQuizAttemptDto.score,

      lecture,

      enrollment,
    });
  }

  remove(id: QuizAttempt['id']) {
    return this.quizAttemptRepository.remove(id);
  }

  /** Epic 4.2 §3.2 — bulk clear for the admin progress reset. */
  removeByEnrollmentId(enrollmentId: string) {
    return this.quizAttemptRepository.removeByEnrollmentId(enrollmentId);
  }
}
