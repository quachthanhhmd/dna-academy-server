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
import { CreateQuizSaveDto } from './dto/create-quiz-save.dto';
import { UpdateQuizSaveDto } from './dto/update-quiz-save.dto';
import { QuizSaveRepository } from './infrastructure/persistence/quiz-save.repository';
import { IPaginationOptions } from '../utils/types/pagination-options';
import { QuizSave } from './domain/quiz-save';

@Injectable()
export class QuizSavesService {
  constructor(
    private readonly lectureService: LecturesService,

    private readonly enrollmentService: EnrollmentsService,

    // Dependencies here
    private readonly quizSaveRepository: QuizSaveRepository,
  ) {}

  async create(createQuizSaveDto: CreateQuizSaveDto) {
    // Do not remove comment below.
    // <creating-property />

    const lectureObject = await this.lectureService.findById(
      createQuizSaveDto.lecture.id,
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
      createQuizSaveDto.enrollment.id,
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

    return this.quizSaveRepository.create({
      // Do not remove comment below.
      // <creating-property-payload />
      savedAt: createQuizSaveDto.savedAt,

      answersJson: createQuizSaveDto.answersJson,

      lecture,

      enrollment,
    });
  }

  findAllWithPagination({
    paginationOptions,
  }: {
    paginationOptions: IPaginationOptions;
  }) {
    return this.quizSaveRepository.findAllWithPagination({
      paginationOptions: {
        page: paginationOptions.page,
        limit: paginationOptions.limit,
      },
    });
  }

  findById(id: QuizSave['id']) {
    return this.quizSaveRepository.findById(id);
  }

  findByIds(ids: QuizSave['id'][]) {
    return this.quizSaveRepository.findByIds(ids);
  }

  async update(
    id: QuizSave['id'],

    updateQuizSaveDto: UpdateQuizSaveDto,
  ) {
    // Do not remove comment below.
    // <updating-property />

    let lecture: Lecture | undefined = undefined;

    if (updateQuizSaveDto.lecture) {
      const lectureObject = await this.lectureService.findById(
        updateQuizSaveDto.lecture.id,
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

    if (updateQuizSaveDto.enrollment) {
      const enrollmentObject = await this.enrollmentService.findById(
        updateQuizSaveDto.enrollment.id,
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

    return this.quizSaveRepository.update(id, {
      // Do not remove comment below.
      // <updating-property-payload />
      savedAt: updateQuizSaveDto.savedAt,

      answersJson: updateQuizSaveDto.answersJson,

      lecture,

      enrollment,
    });
  }

  remove(id: QuizSave['id']) {
    return this.quizSaveRepository.remove(id);
  }
}
