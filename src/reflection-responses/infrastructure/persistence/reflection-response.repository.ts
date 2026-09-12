import { DeepPartial } from '../../../utils/types/deep-partial.type';
import { NullableType } from '../../../utils/types/nullable.type';
import { IPaginationOptions } from '../../../utils/types/pagination-options';
import { ReflectionResponse } from '../../domain/reflection-response';

export abstract class ReflectionResponseRepository {
  abstract create(
    data: Omit<ReflectionResponse, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<ReflectionResponse>;

  abstract findAllWithPagination({
    paginationOptions,
  }: {
    paginationOptions: IPaginationOptions;
  }): Promise<ReflectionResponse[]>;

  abstract findById(
    id: ReflectionResponse['id'],
  ): Promise<NullableType<ReflectionResponse>>;

  abstract findByIds(
    ids: ReflectionResponse['id'][],
  ): Promise<ReflectionResponse[]>;

  abstract findByEnrollmentId(
    enrollmentId: string,
  ): Promise<ReflectionResponse[]>;

  abstract update(
    id: ReflectionResponse['id'],
    payload: DeepPartial<ReflectionResponse>,
  ): Promise<ReflectionResponse | null>;

  abstract remove(id: ReflectionResponse['id']): Promise<void>;

  /** Epic 4.2 §3.2 — bulk clear for the admin progress reset. */
  abstract removeByEnrollmentId(enrollmentId: string): Promise<void>;
}
