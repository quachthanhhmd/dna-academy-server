import { DeepPartial } from '../../../utils/types/deep-partial.type';
import { NullableType } from '../../../utils/types/nullable.type';
import { IPaginationOptions } from '../../../utils/types/pagination-options';
import { Certificate } from '../../domain/certificate';

export abstract class CertificateRepository {
  abstract create(
    data: Omit<Certificate, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<Certificate>;

  abstract findAllWithPagination({
    paginationOptions,
  }: {
    paginationOptions: IPaginationOptions;
  }): Promise<Certificate[]>;

  abstract findById(id: Certificate['id']): Promise<NullableType<Certificate>>;

  abstract findByIds(ids: Certificate['id'][]): Promise<Certificate[]>;

  abstract update(
    id: Certificate['id'],
    payload: DeepPartial<Certificate>,
  ): Promise<Certificate | null>;

  abstract remove(id: Certificate['id']): Promise<void>;
}
