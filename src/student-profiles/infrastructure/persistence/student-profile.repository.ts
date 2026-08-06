import { DeepPartial } from '../../../utils/types/deep-partial.type';
import { NullableType } from '../../../utils/types/nullable.type';
import { IPaginationOptions } from '../../../utils/types/pagination-options';
import { StudentProfile } from '../../domain/student-profile';

export abstract class StudentProfileRepository {
  abstract create(
    data: Omit<StudentProfile, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<StudentProfile>;

  abstract findAllWithPagination({
    paginationOptions,
  }: {
    paginationOptions: IPaginationOptions;
  }): Promise<StudentProfile[]>;

  abstract findById(
    id: StudentProfile['id'],
  ): Promise<NullableType<StudentProfile>>;

  abstract findByIds(ids: StudentProfile['id'][]): Promise<StudentProfile[]>;

  abstract update(
    id: StudentProfile['id'],
    payload: DeepPartial<StudentProfile>,
  ): Promise<StudentProfile | null>;

  abstract remove(id: StudentProfile['id']): Promise<void>;
}
