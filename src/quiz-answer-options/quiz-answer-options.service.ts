import { QuizQuestionsService } from '../quiz-questions/quiz-questions.service';
import { QuizQuestion } from '../quiz-questions/domain/quiz-question';

import {
  // common
  Injectable,
  HttpStatus,
  UnprocessableEntityException,
} from '@nestjs/common';
import { CreateQuizAnswerOptionDto } from './dto/create-quiz-answer-option.dto';
import { UpdateQuizAnswerOptionDto } from './dto/update-quiz-answer-option.dto';
import { QuizAnswerOptionRepository } from './infrastructure/persistence/quiz-answer-option.repository';
import { IPaginationOptions } from '../utils/types/pagination-options';
import { QuizAnswerOption } from './domain/quiz-answer-option';

@Injectable()
export class QuizAnswerOptionsService {
  constructor(
    private readonly quizQuestionService: QuizQuestionsService,

    // Dependencies here
    private readonly quizAnswerOptionRepository: QuizAnswerOptionRepository,
  ) {}

  async create(createQuizAnswerOptionDto: CreateQuizAnswerOptionDto) {
    // Do not remove comment below.
    // <creating-property />

    const questionObject = await this.quizQuestionService.findById(
      createQuizAnswerOptionDto.question.id,
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

    return this.quizAnswerOptionRepository.create({
      // Do not remove comment below.
      // <creating-property-payload />
      displayOrder: createQuizAnswerOptionDto.displayOrder,

      isCorrect: createQuizAnswerOptionDto.isCorrect,

      optionText: createQuizAnswerOptionDto.optionText,

      question,
    });
  }

  findAllWithPagination({
    paginationOptions,
  }: {
    paginationOptions: IPaginationOptions;
  }) {
    return this.quizAnswerOptionRepository.findAllWithPagination({
      paginationOptions: {
        page: paginationOptions.page,
        limit: paginationOptions.limit,
      },
    });
  }

  findById(id: QuizAnswerOption['id']) {
    return this.quizAnswerOptionRepository.findById(id);
  }

  findByIds(ids: QuizAnswerOption['id'][]) {
    return this.quizAnswerOptionRepository.findByIds(ids);
  }

  removeByQuestionIds(questionIds: string[]) {
    return this.quizAnswerOptionRepository.removeByQuestionIds(questionIds);
  }

  async update(
    id: QuizAnswerOption['id'],

    updateQuizAnswerOptionDto: UpdateQuizAnswerOptionDto,
  ) {
    // Do not remove comment below.
    // <updating-property />

    let question: QuizQuestion | undefined = undefined;

    if (updateQuizAnswerOptionDto.question) {
      const questionObject = await this.quizQuestionService.findById(
        updateQuizAnswerOptionDto.question.id,
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

    return this.quizAnswerOptionRepository.update(id, {
      // Do not remove comment below.
      // <updating-property-payload />
      displayOrder: updateQuizAnswerOptionDto.displayOrder,

      isCorrect: updateQuizAnswerOptionDto.isCorrect,

      optionText: updateQuizAnswerOptionDto.optionText,

      question,
    });
  }

  remove(id: QuizAnswerOption['id']) {
    return this.quizAnswerOptionRepository.remove(id);
  }
}
