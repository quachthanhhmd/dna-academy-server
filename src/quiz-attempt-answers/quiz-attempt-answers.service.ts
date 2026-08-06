import { UsersService } from '../users/users.service';
import { User } from '../users/domain/user';

import { MediaFilesService } from '../media-files/media-files.service';
import { MediaFile } from '../media-files/domain/media-file';

import { QuizAnswerOptionsService } from '../quiz-answer-options/quiz-answer-options.service';
import { QuizAnswerOption } from '../quiz-answer-options/domain/quiz-answer-option';

import { QuizQuestionsService } from '../quiz-questions/quiz-questions.service';
import { QuizQuestion } from '../quiz-questions/domain/quiz-question';

import { QuizAttemptsService } from '../quiz-attempts/quiz-attempts.service';
import { QuizAttempt } from '../quiz-attempts/domain/quiz-attempt';
import {
  // common
  Injectable,
  HttpStatus,
  UnprocessableEntityException,
} from '@nestjs/common';
import { CreateQuizAttemptAnswerDto } from './dto/create-quiz-attempt-answer.dto';
import { UpdateQuizAttemptAnswerDto } from './dto/update-quiz-attempt-answer.dto';
import { QuizAttemptAnswerRepository } from './infrastructure/persistence/quiz-attempt-answer.repository';
import { IPaginationOptions } from '../utils/types/pagination-options';
import { QuizAttemptAnswer } from './domain/quiz-attempt-answer';

@Injectable()
export class QuizAttemptAnswersService {
  constructor(
    private readonly userService: UsersService,

    private readonly mediaFileService: MediaFilesService,

    private readonly quizAnswerOptionService: QuizAnswerOptionsService,

    private readonly quizQuestionService: QuizQuestionsService,

    private readonly quizAttemptService: QuizAttemptsService,

    // Dependencies here
    private readonly quizAttemptAnswerRepository: QuizAttemptAnswerRepository,
  ) {}

  async create(createQuizAttemptAnswerDto: CreateQuizAttemptAnswerDto) {
    // Do not remove comment below.
    // <creating-property />

    let gradedBy: User | null | undefined = undefined;

    if (createQuizAttemptAnswerDto.gradedBy) {
      const gradedByObject = await this.userService.findById(
        createQuizAttemptAnswerDto.gradedBy.id,
      );
      if (!gradedByObject) {
        throw new UnprocessableEntityException({
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          errors: {
            gradedBy: 'notExists',
          },
        });
      }
      gradedBy = gradedByObject;
    } else if (createQuizAttemptAnswerDto.gradedBy === null) {
      gradedBy = null;
    }

    let file: MediaFile | null | undefined = undefined;

    if (createQuizAttemptAnswerDto.file) {
      const fileObject = await this.mediaFileService.findById(
        createQuizAttemptAnswerDto.file.id,
      );
      if (!fileObject) {
        throw new UnprocessableEntityException({
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          errors: {
            file: 'notExists',
          },
        });
      }
      file = fileObject;
    } else if (createQuizAttemptAnswerDto.file === null) {
      file = null;
    }

    let selectedOption: QuizAnswerOption | null | undefined = undefined;

    if (createQuizAttemptAnswerDto.selectedOption) {
      const selectedOptionObject = await this.quizAnswerOptionService.findById(
        createQuizAttemptAnswerDto.selectedOption.id,
      );
      if (!selectedOptionObject) {
        throw new UnprocessableEntityException({
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          errors: {
            selectedOption: 'notExists',
          },
        });
      }
      selectedOption = selectedOptionObject;
    } else if (createQuizAttemptAnswerDto.selectedOption === null) {
      selectedOption = null;
    }

    const questionObject = await this.quizQuestionService.findById(
      createQuizAttemptAnswerDto.question.id,
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

    const attemptObject = await this.quizAttemptService.findById(
      createQuizAttemptAnswerDto.attempt.id,
    );
    if (!attemptObject) {
      throw new UnprocessableEntityException({
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        errors: {
          attempt: 'notExists',
        },
      });
    }
    const attempt = attemptObject;

    return this.quizAttemptAnswerRepository.create({
      // Do not remove comment below.
      // <creating-property-payload />
      gradedAt: createQuizAttemptAnswerDto.gradedAt,

      gradedBy,

      score: createQuizAttemptAnswerDto.score,

      isCorrect: createQuizAttemptAnswerDto.isCorrect,

      file,

      ratingAnswer: createQuizAttemptAnswerDto.ratingAnswer,

      textAnswer: createQuizAttemptAnswerDto.textAnswer,

      selectedOptionIds: createQuizAttemptAnswerDto.selectedOptionIds,

      selectedOption,

      question,

      attempt,
    });
  }

  findAllWithPagination({
    paginationOptions,
  }: {
    paginationOptions: IPaginationOptions;
  }) {
    return this.quizAttemptAnswerRepository.findAllWithPagination({
      paginationOptions: {
        page: paginationOptions.page,
        limit: paginationOptions.limit,
      },
    });
  }

  findById(id: QuizAttemptAnswer['id']) {
    return this.quizAttemptAnswerRepository.findById(id);
  }

  findByIds(ids: QuizAttemptAnswer['id'][]) {
    return this.quizAttemptAnswerRepository.findByIds(ids);
  }

  async update(
    id: QuizAttemptAnswer['id'],

    updateQuizAttemptAnswerDto: UpdateQuizAttemptAnswerDto,
  ) {
    // Do not remove comment below.
    // <updating-property />

    let gradedBy: User | null | undefined = undefined;

    if (updateQuizAttemptAnswerDto.gradedBy) {
      const gradedByObject = await this.userService.findById(
        updateQuizAttemptAnswerDto.gradedBy.id,
      );
      if (!gradedByObject) {
        throw new UnprocessableEntityException({
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          errors: {
            gradedBy: 'notExists',
          },
        });
      }
      gradedBy = gradedByObject;
    } else if (updateQuizAttemptAnswerDto.gradedBy === null) {
      gradedBy = null;
    }

    let file: MediaFile | null | undefined = undefined;

    if (updateQuizAttemptAnswerDto.file) {
      const fileObject = await this.mediaFileService.findById(
        updateQuizAttemptAnswerDto.file.id,
      );
      if (!fileObject) {
        throw new UnprocessableEntityException({
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          errors: {
            file: 'notExists',
          },
        });
      }
      file = fileObject;
    } else if (updateQuizAttemptAnswerDto.file === null) {
      file = null;
    }

    let selectedOption: QuizAnswerOption | null | undefined = undefined;

    if (updateQuizAttemptAnswerDto.selectedOption) {
      const selectedOptionObject = await this.quizAnswerOptionService.findById(
        updateQuizAttemptAnswerDto.selectedOption.id,
      );
      if (!selectedOptionObject) {
        throw new UnprocessableEntityException({
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          errors: {
            selectedOption: 'notExists',
          },
        });
      }
      selectedOption = selectedOptionObject;
    } else if (updateQuizAttemptAnswerDto.selectedOption === null) {
      selectedOption = null;
    }

    let question: QuizQuestion | undefined = undefined;

    if (updateQuizAttemptAnswerDto.question) {
      const questionObject = await this.quizQuestionService.findById(
        updateQuizAttemptAnswerDto.question.id,
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

    let attempt: QuizAttempt | undefined = undefined;

    if (updateQuizAttemptAnswerDto.attempt) {
      const attemptObject = await this.quizAttemptService.findById(
        updateQuizAttemptAnswerDto.attempt.id,
      );
      if (!attemptObject) {
        throw new UnprocessableEntityException({
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          errors: {
            attempt: 'notExists',
          },
        });
      }
      attempt = attemptObject;
    }

    return this.quizAttemptAnswerRepository.update(id, {
      // Do not remove comment below.
      // <updating-property-payload />
      gradedAt: updateQuizAttemptAnswerDto.gradedAt,

      gradedBy,

      score: updateQuizAttemptAnswerDto.score,

      isCorrect: updateQuizAttemptAnswerDto.isCorrect,

      file,

      ratingAnswer: updateQuizAttemptAnswerDto.ratingAnswer,

      textAnswer: updateQuizAttemptAnswerDto.textAnswer,

      selectedOptionIds: updateQuizAttemptAnswerDto.selectedOptionIds,

      selectedOption,

      question,

      attempt,
    });
  }

  remove(id: QuizAttemptAnswer['id']) {
    return this.quizAttemptAnswerRepository.remove(id);
  }
}
