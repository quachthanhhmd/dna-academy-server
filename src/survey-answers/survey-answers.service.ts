import { SurveyQuestionOptionsService } from '../survey-question-options/survey-question-options.service';
import { SurveyQuestionOption } from '../survey-question-options/domain/survey-question-option';

import { SurveyQuestionsService } from '../survey-questions/survey-questions.service';
import { SurveyQuestion } from '../survey-questions/domain/survey-question';

import { SurveyResponsesService } from '../survey-responses/survey-responses.service';
import { SurveyResponse } from '../survey-responses/domain/survey-response';

import {
  // common
  Injectable,
  HttpStatus,
  UnprocessableEntityException,
} from '@nestjs/common';
import { CreateSurveyAnswerDto } from './dto/create-survey-answer.dto';
import { UpdateSurveyAnswerDto } from './dto/update-survey-answer.dto';
import {
  SurveyAnswerRepository,
  SurveyAnswerRow,
} from './infrastructure/persistence/survey-answer.repository';
import { IPaginationOptions } from '../utils/types/pagination-options';
import { SurveyAnswer } from './domain/survey-answer';

@Injectable()
export class SurveyAnswersService {
  constructor(
    private readonly surveyQuestionOptionService: SurveyQuestionOptionsService,

    private readonly surveyQuestionService: SurveyQuestionsService,

    private readonly surveyResponseService: SurveyResponsesService,

    // Dependencies here
    private readonly surveyAnswerRepository: SurveyAnswerRepository,
  ) {}

  async create(createSurveyAnswerDto: CreateSurveyAnswerDto) {
    // Do not remove comment below.
    // <creating-property />
    let option: SurveyQuestionOption | null | undefined = undefined;

    if (createSurveyAnswerDto.option) {
      const optionObject = await this.surveyQuestionOptionService.findById(
        createSurveyAnswerDto.option.id,
      );
      if (!optionObject) {
        throw new UnprocessableEntityException({
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          errors: {
            option: 'notExists',
          },
        });
      }
      option = optionObject;
    } else if (createSurveyAnswerDto.option === null) {
      option = null;
    }

    const questionObject = await this.surveyQuestionService.findById(
      createSurveyAnswerDto.question.id,
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

    const responseObject = await this.surveyResponseService.findById(
      createSurveyAnswerDto.response.id,
    );
    if (!responseObject) {
      throw new UnprocessableEntityException({
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        errors: {
          response: 'notExists',
        },
      });
    }
    const response = responseObject;

    return this.surveyAnswerRepository.create({
      // Do not remove comment below.
      // <creating-property-payload />
      option,

      question,

      response,

      ratingValue: createSurveyAnswerDto.ratingValue,

      textAnswer: createSurveyAnswerDto.textAnswer,
    });
  }

  findAllWithPagination({
    paginationOptions,
  }: {
    paginationOptions: IPaginationOptions;
  }) {
    return this.surveyAnswerRepository.findAllWithPagination({
      paginationOptions: {
        page: paginationOptions.page,
        limit: paginationOptions.limit,
      },
    });
  }

  findById(id: SurveyAnswer['id']) {
    return this.surveyAnswerRepository.findById(id);
  }

  findByIds(ids: SurveyAnswer['id'][]) {
    return this.surveyAnswerRepository.findByIds(ids);
  }

  async update(
    id: SurveyAnswer['id'],

    updateSurveyAnswerDto: UpdateSurveyAnswerDto,
  ) {
    // Do not remove comment below.
    // <updating-property />
    let option: SurveyQuestionOption | null | undefined = undefined;

    if (updateSurveyAnswerDto.option) {
      const optionObject = await this.surveyQuestionOptionService.findById(
        updateSurveyAnswerDto.option.id,
      );
      if (!optionObject) {
        throw new UnprocessableEntityException({
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          errors: {
            option: 'notExists',
          },
        });
      }
      option = optionObject;
    } else if (updateSurveyAnswerDto.option === null) {
      option = null;
    }

    let question: SurveyQuestion | undefined = undefined;

    if (updateSurveyAnswerDto.question) {
      const questionObject = await this.surveyQuestionService.findById(
        updateSurveyAnswerDto.question.id,
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

    let response: SurveyResponse | undefined = undefined;

    if (updateSurveyAnswerDto.response) {
      const responseObject = await this.surveyResponseService.findById(
        updateSurveyAnswerDto.response.id,
      );
      if (!responseObject) {
        throw new UnprocessableEntityException({
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          errors: {
            response: 'notExists',
          },
        });
      }
      response = responseObject;
    }

    return this.surveyAnswerRepository.update(id, {
      // Do not remove comment below.
      // <updating-property-payload />
      option,

      question,

      response,

      ratingValue: updateSurveyAnswerDto.ratingValue,

      textAnswer: updateSurveyAnswerDto.textAnswer,
    });
  }

  remove(id: SurveyAnswer['id']) {
    return this.surveyAnswerRepository.remove(id);
  }

  findByResponse(responseId: string) {
    return this.surveyAnswerRepository.findByResponse(responseId);
  }

  replaceForQuestions(
    responseId: string,
    questionIds: string[],
    rows: Omit<SurveyAnswerRow, 'responseId'>[],
  ) {
    return this.surveyAnswerRepository.replaceForQuestions(
      responseId,
      questionIds,
      rows,
    );
  }

  countByQuestions(questionIds: string[]) {
    return this.surveyAnswerRepository.countByQuestions(questionIds);
  }

  countByOptions(optionIds: string[]) {
    return this.surveyAnswerRepository.countByOptions(optionIds);
  }
}
