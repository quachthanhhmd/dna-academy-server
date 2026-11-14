import { DeepPartial } from '../../../utils/types/deep-partial.type';
import { NullableType } from '../../../utils/types/nullable.type';
import { IPaginationOptions } from '../../../utils/types/pagination-options';
import { SurveyQuestionOption } from '../../domain/survey-question-option';

export type SurveyOptionFields = { optionText: string; displayOrder: number };

export type SurveyOptionRow = SurveyOptionFields & {
  id: string;
  questionId: string;
  archivedAt: Date | null;
};

export abstract class SurveyQuestionOptionRepository {
  abstract create(
    data: Omit<SurveyQuestionOption, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<SurveyQuestionOption>;

  abstract findAllWithPagination({
    paginationOptions,
  }: {
    paginationOptions: IPaginationOptions;
  }): Promise<SurveyQuestionOption[]>;

  abstract findById(
    id: SurveyQuestionOption['id'],
  ): Promise<NullableType<SurveyQuestionOption>>;

  abstract findByIds(
    ids: SurveyQuestionOption['id'][],
  ): Promise<SurveyQuestionOption[]>;

  abstract update(
    id: SurveyQuestionOption['id'],
    payload: DeepPartial<SurveyQuestionOption>,
  ): Promise<SurveyQuestionOption | null>;

  abstract remove(id: SurveyQuestionOption['id']): Promise<void>;

  abstract findByQuestions(
    questionIds: string[],
    includeArchived?: boolean,
  ): Promise<SurveyOptionRow[]>;

  abstract createForQuestion(
    questionId: string,
    fields: SurveyOptionFields,
  ): Promise<string>;

  abstract patch(
    id: string,
    fields: Partial<SurveyOptionFields>,
  ): Promise<void>;

  abstract archive(ids: string[]): Promise<void>;

  abstract removeMany(ids: string[]): Promise<void>;
}
