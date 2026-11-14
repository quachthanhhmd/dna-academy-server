import { LecturesService } from '../lectures/lectures.service';
import { Lecture } from '../lectures/domain/lecture';

import {
  // common
  Injectable,
  HttpStatus,
  UnprocessableEntityException,
} from '@nestjs/common';
import { CreateSurveyQuestionDto } from './dto/create-survey-question.dto';
import { UpdateSurveyQuestionDto } from './dto/update-survey-question.dto';
import {
  SurveyQuestionFields,
  SurveyQuestionRepository,
} from './infrastructure/persistence/survey-question.repository';
import { IPaginationOptions } from '../utils/types/pagination-options';
import { SurveyQuestion } from './domain/survey-question';

@Injectable()
export class SurveyQuestionsService {
  constructor(
    private readonly lectureService: LecturesService,

    // Dependencies here
    private readonly surveyQuestionRepository: SurveyQuestionRepository,
  ) {}

  async create(createSurveyQuestionDto: CreateSurveyQuestionDto) {
    // Do not remove comment below.
    // <creating-property />
    const lectureObject = await this.lectureService.findById(
      createSurveyQuestionDto.lecture.id,
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

    return this.surveyQuestionRepository.create({
      // Do not remove comment below.
      // <creating-property-payload />
      lecture,

      archivedAt: createSurveyQuestionDto.archivedAt,

      ratingLabelMax: createSurveyQuestionDto.ratingLabelMax,

      ratingLabelMin: createSurveyQuestionDto.ratingLabelMin,

      ratingMax: createSurveyQuestionDto.ratingMax,

      displayOrder: createSurveyQuestionDto.displayOrder,

      isRequired: createSurveyQuestionDto.isRequired,

      questionText: createSurveyQuestionDto.questionText,

      questionType: createSurveyQuestionDto.questionType,
    });
  }

  findAllWithPagination({
    paginationOptions,
  }: {
    paginationOptions: IPaginationOptions;
  }) {
    return this.surveyQuestionRepository.findAllWithPagination({
      paginationOptions: {
        page: paginationOptions.page,
        limit: paginationOptions.limit,
      },
    });
  }

  findById(id: SurveyQuestion['id']) {
    return this.surveyQuestionRepository.findById(id);
  }

  findByIds(ids: SurveyQuestion['id'][]) {
    return this.surveyQuestionRepository.findByIds(ids);
  }

  async update(
    id: SurveyQuestion['id'],

    updateSurveyQuestionDto: UpdateSurveyQuestionDto,
  ) {
    // Do not remove comment below.
    // <updating-property />
    let lecture: Lecture | undefined = undefined;

    if (updateSurveyQuestionDto.lecture) {
      const lectureObject = await this.lectureService.findById(
        updateSurveyQuestionDto.lecture.id,
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

    return this.surveyQuestionRepository.update(id, {
      // Do not remove comment below.
      // <updating-property-payload />
      lecture,

      archivedAt: updateSurveyQuestionDto.archivedAt,

      ratingLabelMax: updateSurveyQuestionDto.ratingLabelMax,

      ratingLabelMin: updateSurveyQuestionDto.ratingLabelMin,

      ratingMax: updateSurveyQuestionDto.ratingMax,

      displayOrder: updateSurveyQuestionDto.displayOrder,

      isRequired: updateSurveyQuestionDto.isRequired,

      questionText: updateSurveyQuestionDto.questionText,

      questionType: updateSurveyQuestionDto.questionType,
    });
  }

  remove(id: SurveyQuestion['id']) {
    return this.surveyQuestionRepository.remove(id);
  }

  findByLecture(lectureId: string, includeArchived = false) {
    return this.surveyQuestionRepository.findByLecture(
      lectureId,
      includeArchived,
    );
  }

  createForLecture(lectureId: string, fields: SurveyQuestionFields) {
    return this.surveyQuestionRepository.createForLecture(lectureId, fields);
  }

  patch(id: string, fields: Partial<SurveyQuestionFields>) {
    return this.surveyQuestionRepository.patch(id, fields);
  }

  archive(ids: string[]) {
    return this.surveyQuestionRepository.archive(ids);
  }

  removeMany(ids: string[]) {
    return this.surveyQuestionRepository.removeMany(ids);
  }
}
