import { LecturesService } from '../lectures/lectures.service';
import { Lecture } from '../lectures/domain/lecture';

import {
  // common
  Injectable,
  HttpStatus,
  UnprocessableEntityException,
} from '@nestjs/common';
import { CreateQuizQuestionDto } from './dto/create-quiz-question.dto';
import { UpdateQuizQuestionDto } from './dto/update-quiz-question.dto';
import { QuizQuestionRepository } from './infrastructure/persistence/quiz-question.repository';
import { IPaginationOptions } from '../utils/types/pagination-options';
import { QuizQuestion } from './domain/quiz-question';

@Injectable()
export class QuizQuestionsService {
  constructor(
    private readonly lectureService: LecturesService,

    // Dependencies here
    private readonly quizQuestionRepository: QuizQuestionRepository,
  ) {}

  async create(createQuizQuestionDto: CreateQuizQuestionDto) {
    // Do not remove comment below.
    // <creating-property />

    const lectureObject = await this.lectureService.findById(
      createQuizQuestionDto.lecture.id,
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

    return this.quizQuestionRepository.create({
      // Do not remove comment below.
      // <creating-property-payload />
      displayOrder: createQuizQuestionDto.displayOrder,

      maxFileSizeMb: createQuizQuestionDto.maxFileSizeMb,

      allowedMimeTypes: createQuizQuestionDto.allowedMimeTypes,

      minWordCount: createQuizQuestionDto.minWordCount,

      ratingLabelMax: createQuizQuestionDto.ratingLabelMax,

      ratingLabelMin: createQuizQuestionDto.ratingLabelMin,

      ratingMax: createQuizQuestionDto.ratingMax,

      ratingMin: createQuizQuestionDto.ratingMin,

      isRequired: createQuizQuestionDto.isRequired,

      questionType: createQuizQuestionDto.questionType,

      questionText: createQuizQuestionDto.questionText,

      lecture,
    });
  }

  findAllWithPagination({
    paginationOptions,
  }: {
    paginationOptions: IPaginationOptions;
  }) {
    return this.quizQuestionRepository.findAllWithPagination({
      paginationOptions: {
        page: paginationOptions.page,
        limit: paginationOptions.limit,
      },
    });
  }

  findById(id: QuizQuestion['id']) {
    return this.quizQuestionRepository.findById(id);
  }

  findByIds(ids: QuizQuestion['id'][]) {
    return this.quizQuestionRepository.findByIds(ids);
  }

  async update(
    id: QuizQuestion['id'],

    updateQuizQuestionDto: UpdateQuizQuestionDto,
  ) {
    // Do not remove comment below.
    // <updating-property />

    let lecture: Lecture | undefined = undefined;

    if (updateQuizQuestionDto.lecture) {
      const lectureObject = await this.lectureService.findById(
        updateQuizQuestionDto.lecture.id,
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

    return this.quizQuestionRepository.update(id, {
      // Do not remove comment below.
      // <updating-property-payload />
      displayOrder: updateQuizQuestionDto.displayOrder,

      maxFileSizeMb: updateQuizQuestionDto.maxFileSizeMb,

      allowedMimeTypes: updateQuizQuestionDto.allowedMimeTypes,

      minWordCount: updateQuizQuestionDto.minWordCount,

      ratingLabelMax: updateQuizQuestionDto.ratingLabelMax,

      ratingLabelMin: updateQuizQuestionDto.ratingLabelMin,

      ratingMax: updateQuizQuestionDto.ratingMax,

      ratingMin: updateQuizQuestionDto.ratingMin,

      isRequired: updateQuizQuestionDto.isRequired,

      questionType: updateQuizQuestionDto.questionType,

      questionText: updateQuizQuestionDto.questionText,

      lecture,
    });
  }

  remove(id: QuizQuestion['id']) {
    return this.quizQuestionRepository.remove(id);
  }
}
