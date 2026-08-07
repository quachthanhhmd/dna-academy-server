import { DeepPartial } from '../../../utils/types/deep-partial.type';
import { NullableType } from '../../../utils/types/nullable.type';
import { IPaginationOptions } from '../../../utils/types/pagination-options';
import { MasterDataCode } from '../../domain/master-data-code';

export abstract class MasterDataCodeRepository {
  abstract create(
    data: Omit<MasterDataCode, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<MasterDataCode>;

  abstract findAllWithPagination({
    filterOptions,
    paginationOptions,
  }: {
    filterOptions?: { groupKey?: string; isActive?: boolean } | null;
    paginationOptions: IPaginationOptions;
  }): Promise<MasterDataCode[]>;

  abstract findById(
    id: MasterDataCode['id'],
  ): Promise<NullableType<MasterDataCode>>;

  abstract findByIds(ids: MasterDataCode['id'][]): Promise<MasterDataCode[]>;

  abstract findByGroupIdAndName(
    groupId: string,
    name: string,
  ): Promise<NullableType<MasterDataCode>>;

  abstract update(
    id: MasterDataCode['id'],
    payload: DeepPartial<MasterDataCode>,
  ): Promise<MasterDataCode | null>;

  abstract remove(id: MasterDataCode['id']): Promise<void>;
}
