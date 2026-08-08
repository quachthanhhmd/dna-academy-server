import { DeepPartial } from '../../../utils/types/deep-partial.type';
import { NullableType } from '../../../utils/types/nullable.type';
import { IPaginationOptions } from '../../../utils/types/pagination-options';
import { MasterDataGroup } from '../../domain/master-data-group';

export abstract class MasterDataGroupRepository {
  abstract create(
    data: Omit<MasterDataGroup, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<MasterDataGroup>;

  abstract findAllWithPagination({
    paginationOptions,
  }: {
    paginationOptions: IPaginationOptions;
  }): Promise<MasterDataGroup[]>;

  abstract findById(
    id: MasterDataGroup['id'],
  ): Promise<NullableType<MasterDataGroup>>;

  abstract findByIds(ids: MasterDataGroup['id'][]): Promise<MasterDataGroup[]>;

  abstract findByGroupKey(
    groupKey: MasterDataGroup['groupKey'],
  ): Promise<NullableType<MasterDataGroup>>;

  abstract update(
    id: MasterDataGroup['id'],
    payload: DeepPartial<MasterDataGroup>,
  ): Promise<MasterDataGroup | null>;

  abstract remove(id: MasterDataGroup['id']): Promise<void>;
}
