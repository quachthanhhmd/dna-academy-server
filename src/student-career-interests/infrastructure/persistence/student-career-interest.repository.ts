import { DeepPartial } from '../../../utils/types/deep-partial.type';
import { NullableType } from '../../../utils/types/nullable.type';
import { IPaginationOptions } from '../../../utils/types/pagination-options';
import { StudentCareerInterest } from '../../domain/student-career-interest';

export abstract class StudentCareerInterestRepository {
  abstract create(
    data: Omit<StudentCareerInterest, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<StudentCareerInterest>;

  abstract findAllWithPagination({
    paginationOptions,
  }: {
    paginationOptions: IPaginationOptions;
  }): Promise<StudentCareerInterest[]>;

  abstract findById(
    id: StudentCareerInterest['id'],
  ): Promise<NullableType<StudentCareerInterest>>;

  abstract findByIds(
    ids: StudentCareerInterest['id'][],
  ): Promise<StudentCareerInterest[]>;

  abstract update(
    id: StudentCareerInterest['id'],
    payload: DeepPartial<StudentCareerInterest>,
  ): Promise<StudentCareerInterest | null>;

  abstract remove(id: StudentCareerInterest['id']): Promise<void>;
}
