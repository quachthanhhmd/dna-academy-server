import { SurveyQuestion } from '../survey-questions/domain/survey-question';
import { SurveyQuestionsService } from '../survey-questions/survey-questions.service';
import {
  // common
  Injectable,
  HttpStatus,
  UnprocessableEntityException,
} from '@nestjs/common';
import { CreateSurveyQuestionOptionDto } from './dto/create-survey-question-option.dto';
import { UpdateSurveyQuestionOptionDto } from './dto/update-survey-question-option.dto';
import {
  SurveyOptionFields,
  SurveyQuestionOptionRepository,
} from './infrastructure/persistence/survey-question-option.repository';
import { IPaginationOptions } from '../utils/types/pagination-options';
import { SurveyQuestionOption } from './domain/survey-question-option';

@Injectable()
export class SurveyQuestionOptionsService {
  constructor(
    private readonly surveyQuestionService: SurveyQuestionsService,

    // Dependencies here
    private readonly surveyQuestionOptionRepository: SurveyQuestionOptionRepository,
  ) {}

  async create(createSurveyQuestionOptionDto: CreateSurveyQuestionOptionDto) {
    // Do not remove comment below.
    // <creating-property />
    const questionObject = await this.surveyQuestionService.findById(
      createSurveyQuestionOptionDto.question.id,
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

    return this.surveyQuestionOptionRepository.create({
      // Do not remove comment below.
      // <creating-property-payload />
      question,

      archivedAt: createSurveyQuestionOptionDto.archivedAt,

      displayOrder: createSurveyQuestionOptionDto.displayOrder,

      optionText: createSurveyQuestionOptionDto.optionText,
    });
  }

  findAllWithPagination({
    paginationOptions,
  }: {
    paginationOptions: IPaginationOptions;
  }) {
    return this.surveyQuestionOptionRepository.findAllWithPagination({
      paginationOptions: {
        page: paginationOptions.page,
        limit: paginationOptions.limit,
      },
    });
  }

  findById(id: SurveyQuestionOption['id']) {
    return this.surveyQuestionOptionRepository.findById(id);
  }

  findByIds(ids: SurveyQuestionOption['id'][]) {
    return this.surveyQuestionOptionRepository.findByIds(ids);
  }

  async update(
    id: SurveyQuestionOption['id'],

    updateSurveyQuestionOptionDto: UpdateSurveyQuestionOptionDto,
  ) {
    // Do not remove comment below.
    // <updating-property />
    let question: SurveyQuestion | undefined = undefined;

    if (updateSurveyQuestionOptionDto.question) {
      const questionObject = await this.surveyQuestionService.findById(
        updateSurveyQuestionOptionDto.question.id,
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

    return this.surveyQuestionOptionRepository.update(id, {
      // Do not remove comment below.
      // <updating-property-payload />
      question,

      archivedAt: updateSurveyQuestionOptionDto.archivedAt,

      displayOrder: updateSurveyQuestionOptionDto.displayOrder,

      optionText: updateSurveyQuestionOptionDto.optionText,
    });
  }

  remove(id: SurveyQuestionOption['id']) {
    return this.surveyQuestionOptionRepository.remove(id);
  }

  findByQuestions(questionIds: string[], includeArchived = false) {
    return this.surveyQuestionOptionRepository.findByQuestions(
      questionIds,
      includeArchived,
    );
  }

  createForQuestion(questionId: string, fields: SurveyOptionFields) {
    return this.surveyQuestionOptionRepository.createForQuestion(
      questionId,
      fields,
    );
  }

  patch(id: string, fields: Partial<SurveyOptionFields>) {
    return this.surveyQuestionOptionRepository.patch(id, fields);
  }

  archive(ids: string[]) {
    return this.surveyQuestionOptionRepository.archive(ids);
  }

  removeMany(ids: string[]) {
    return this.surveyQuestionOptionRepository.removeMany(ids);
  }
}
