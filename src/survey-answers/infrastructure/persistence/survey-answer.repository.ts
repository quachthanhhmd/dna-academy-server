import { DeepPartial } from '../../../utils/types/deep-partial.type';
import { NullableType } from '../../../utils/types/nullable.type';
import { IPaginationOptions } from '../../../utils/types/pagination-options';
import { SurveyAnswer } from '../../domain/survey-answer';

export type SurveyAnswerRow = {
  responseId: string;
  questionId: string;
  optionId: string | null;
  textAnswer: string | null;
  ratingValue: number | null;
};

export abstract class SurveyAnswerRepository {
  abstract create(
    data: Omit<SurveyAnswer, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<SurveyAnswer>;

  abstract findAllWithPagination({
    paginationOptions,
  }: {
    paginationOptions: IPaginationOptions;
  }): Promise<SurveyAnswer[]>;

  abstract findById(
    id: SurveyAnswer['id'],
  ): Promise<NullableType<SurveyAnswer>>;

  abstract findByIds(ids: SurveyAnswer['id'][]): Promise<SurveyAnswer[]>;

  abstract update(
    id: SurveyAnswer['id'],
    payload: DeepPartial<SurveyAnswer>,
  ): Promise<SurveyAnswer | null>;

  abstract remove(id: SurveyAnswer['id']): Promise<void>;

  abstract findByResponse(responseId: string): Promise<SurveyAnswerRow[]>;

  /**
   * Replaces this response's answers to `questionIds` with `rows`. Answers to
   * any other question — an archived one — are left exactly as they are.
   */
  abstract replaceForQuestions(
    responseId: string,
    questionIds: string[],
    rows: Omit<SurveyAnswerRow, 'responseId'>[],
  ): Promise<void>;

  /** How many answers each question has; questions with none are absent. */
  abstract countByQuestions(
    questionIds: string[],
  ): Promise<Map<string, number>>;

  /** How many times each option was chosen; never-chosen ones are absent. */
  abstract countByOptions(optionIds: string[]): Promise<Map<string, number>>;
}
