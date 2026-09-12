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

  /** Epic 4.1 §3.2 — the public verification lookup. */
  abstract findByNumber(
    certificateNumber: string,
  ): Promise<NullableType<Certificate>>;

  abstract findByEnrollmentId(
    enrollmentId: string,
  ): Promise<NullableType<Certificate>>;

  /** Epic 4.5 BE-1 — one query for a whole dashboard page. */
  abstract findByEnrollmentIds(enrollmentIds: string[]): Promise<Certificate[]>;

  /**
   * Next value of `certificate_number_seq`. A row count cannot be used for
   * this — two concurrent completions would read the same count and mint
   * the same number.
   */
  abstract nextSequenceValue(): Promise<number>;

  abstract update(
    id: Certificate['id'],
    payload: DeepPartial<Certificate>,
  ): Promise<Certificate | null>;

  abstract remove(id: Certificate['id']): Promise<void>;
}
