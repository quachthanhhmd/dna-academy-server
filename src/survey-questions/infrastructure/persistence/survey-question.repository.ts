import { DeepPartial } from '../../../utils/types/deep-partial.type';
import { NullableType } from '../../../utils/types/nullable.type';
import { IPaginationOptions } from '../../../utils/types/pagination-options';
import { SurveyQuestion } from '../../domain/survey-question';

export type SurveyQuestionFields = {
  questionType: string;
  questionText: string;
  isRequired: boolean;
  displayOrder: number;
  ratingMax: number | null;
  ratingLabelMin: string | null;
  ratingLabelMax: string | null;
};

export type SurveyQuestionRow = SurveyQuestionFields & {
  id: string;
  lectureId: string;
  archivedAt: Date | null;
};

export abstract class SurveyQuestionRepository {
  abstract create(
    data: Omit<SurveyQuestion, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<SurveyQuestion>;

  abstract findAllWithPagination({
    paginationOptions,
  }: {
    paginationOptions: IPaginationOptions;
  }): Promise<SurveyQuestion[]>;

  abstract findById(
    id: SurveyQuestion['id'],
  ): Promise<NullableType<SurveyQuestion>>;

  abstract findByIds(ids: SurveyQuestion['id'][]): Promise<SurveyQuestion[]>;

  abstract update(
    id: SurveyQuestion['id'],
    payload: DeepPartial<SurveyQuestion>,
  ): Promise<SurveyQuestion | null>;

  abstract remove(id: SurveyQuestion['id']): Promise<void>;

  /** Ordered by display order; archived questions only when asked for. */
  abstract findByLecture(
    lectureId: string,
    includeArchived?: boolean,
  ): Promise<SurveyQuestionRow[]>;

  abstract createForLecture(
    lectureId: string,
    fields: SurveyQuestionFields,
  ): Promise<string>;

  abstract patch(
    id: string,
    fields: Partial<SurveyQuestionFields>,
  ): Promise<void>;

  abstract archive(ids: string[]): Promise<void>;

  abstract removeMany(ids: string[]): Promise<void>;
}
