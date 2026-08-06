import { DeepPartial } from '../../../utils/types/deep-partial.type';
import { NullableType } from '../../../utils/types/nullable.type';
import { IPaginationOptions } from '../../../utils/types/pagination-options';
import { OauthAccount } from '../../domain/oauth-account';

export abstract class OauthAccountRepository {
  abstract create(
    data: Omit<OauthAccount, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<OauthAccount>;

  abstract findAllWithPagination({
    paginationOptions,
  }: {
    paginationOptions: IPaginationOptions;
  }): Promise<OauthAccount[]>;

  abstract findById(
    id: OauthAccount['id'],
  ): Promise<NullableType<OauthAccount>>;

  abstract findByIds(ids: OauthAccount['id'][]): Promise<OauthAccount[]>;

  abstract update(
    id: OauthAccount['id'],
    payload: DeepPartial<OauthAccount>,
  ): Promise<OauthAccount | null>;

  abstract remove(id: OauthAccount['id']): Promise<void>;
}
