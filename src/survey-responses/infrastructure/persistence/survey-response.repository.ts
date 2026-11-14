import { DeepPartial } from '../../../utils/types/deep-partial.type';
import { NullableType } from '../../../utils/types/nullable.type';
import { IPaginationOptions } from '../../../utils/types/pagination-options';
import { SurveyResponse } from '../../domain/survey-response';

export abstract class SurveyResponseRepository {
  abstract create(
    data: Omit<SurveyResponse, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<SurveyResponse>;

  abstract findAllWithPagination({
    paginationOptions,
  }: {
    paginationOptions: IPaginationOptions;
  }): Promise<SurveyResponse[]>;

  abstract findById(
    id: SurveyResponse['id'],
  ): Promise<NullableType<SurveyResponse>>;

  abstract findByIds(ids: SurveyResponse['id'][]): Promise<SurveyResponse[]>;

  abstract update(
    id: SurveyResponse['id'],
    payload: DeepPartial<SurveyResponse>,
  ): Promise<SurveyResponse | null>;

  abstract remove(id: SurveyResponse['id']): Promise<void>;

  abstract findOne(
    lectureId: string,
    enrollmentId: string,
  ): Promise<{ id: string; submittedAt: Date } | null>;

  /** Insert the learner's response or stamp the existing one; returns its id. */
  abstract upsert(
    lectureId: string,
    enrollmentId: string,
    submittedAt: Date,
  ): Promise<string>;

  abstract removeByEnrollmentId(enrollmentId: string): Promise<void>;
}
