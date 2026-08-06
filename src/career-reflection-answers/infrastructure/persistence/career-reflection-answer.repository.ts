import { DeepPartial } from '../../../utils/types/deep-partial.type';
import { NullableType } from '../../../utils/types/nullable.type';
import { IPaginationOptions } from '../../../utils/types/pagination-options';
import { CareerReflectionAnswer } from '../../domain/career-reflection-answer';

export abstract class CareerReflectionAnswerRepository {
  abstract create(
    data: Omit<CareerReflectionAnswer, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<CareerReflectionAnswer>;

  abstract findAllWithPagination({
    paginationOptions,
  }: {
    paginationOptions: IPaginationOptions;
  }): Promise<CareerReflectionAnswer[]>;

  abstract findById(
    id: CareerReflectionAnswer['id'],
  ): Promise<NullableType<CareerReflectionAnswer>>;

  abstract findByIds(
    ids: CareerReflectionAnswer['id'][],
  ): Promise<CareerReflectionAnswer[]>;

  abstract update(
    id: CareerReflectionAnswer['id'],
    payload: DeepPartial<CareerReflectionAnswer>,
  ): Promise<CareerReflectionAnswer | null>;

  abstract remove(id: CareerReflectionAnswer['id']): Promise<void>;
}
