import { DeepPartial } from '../../../utils/types/deep-partial.type';
import { NullableType } from '../../../utils/types/nullable.type';
import { IPaginationOptions } from '../../../utils/types/pagination-options';
import { CareerReflectionQuestion } from '../../domain/career-reflection-question';

export abstract class CareerReflectionQuestionRepository {
  abstract create(
    data: Omit<CareerReflectionQuestion, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<CareerReflectionQuestion>;

  abstract findAllWithPagination({
    paginationOptions,
  }: {
    paginationOptions: IPaginationOptions;
  }): Promise<CareerReflectionQuestion[]>;

  abstract findById(
    id: CareerReflectionQuestion['id'],
  ): Promise<NullableType<CareerReflectionQuestion>>;

  abstract findByIds(
    ids: CareerReflectionQuestion['id'][],
  ): Promise<CareerReflectionQuestion[]>;

  abstract update(
    id: CareerReflectionQuestion['id'],
    payload: DeepPartial<CareerReflectionQuestion>,
  ): Promise<CareerReflectionQuestion | null>;

  abstract remove(id: CareerReflectionQuestion['id']): Promise<void>;
}
