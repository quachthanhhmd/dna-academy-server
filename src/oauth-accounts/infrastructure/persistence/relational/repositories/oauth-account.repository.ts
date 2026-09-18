import { Injectable } from '@nestjs/common';
import { omitUndefined } from '../../../../../utils/omit-undefined';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { OauthAccountEntity } from '../entities/oauth-account.entity';
import { NullableType } from '../../../../../utils/types/nullable.type';
import { OauthAccount } from '../../../../domain/oauth-account';
import { OauthAccountRepository } from '../../oauth-account.repository';
import { OauthAccountMapper } from '../mappers/oauth-account.mapper';
import { IPaginationOptions } from '../../../../../utils/types/pagination-options';

@Injectable()
export class OauthAccountRelationalRepository implements OauthAccountRepository {
  constructor(
    @InjectRepository(OauthAccountEntity)
    private readonly oauthAccountRepository: Repository<OauthAccountEntity>,
  ) {}

  async create(data: OauthAccount): Promise<OauthAccount> {
    const persistenceModel = OauthAccountMapper.toPersistence(data);
    const newEntity = await this.oauthAccountRepository.save(
      this.oauthAccountRepository.create(persistenceModel),
    );
    return OauthAccountMapper.toDomain(newEntity);
  }

  async findAllWithPagination({
    paginationOptions,
  }: {
    paginationOptions: IPaginationOptions;
  }): Promise<OauthAccount[]> {
    const entities = await this.oauthAccountRepository.find({
      skip: (paginationOptions.page - 1) * paginationOptions.limit,
      take: paginationOptions.limit,
    });

    return entities.map((entity) => OauthAccountMapper.toDomain(entity));
  }

  async findById(id: OauthAccount['id']): Promise<NullableType<OauthAccount>> {
    const entity = await this.oauthAccountRepository.findOne({
      where: { id },
    });

    return entity ? OauthAccountMapper.toDomain(entity) : null;
  }

  async findByIds(ids: OauthAccount['id'][]): Promise<OauthAccount[]> {
    const entities = await this.oauthAccountRepository.find({
      where: { id: In(ids) },
    });

    return entities.map((entity) => OauthAccountMapper.toDomain(entity));
  }

  async findByProviderAndProviderUid(
    provider: string,
    providerUid: string,
  ): Promise<NullableType<OauthAccount>> {
    const entity = await this.oauthAccountRepository.findOne({
      where: { provider, providerUid },
    });

    return entity ? OauthAccountMapper.toDomain(entity) : null;
  }

  async findByUserId(userId: number): Promise<OauthAccount[]> {
    const entities = await this.oauthAccountRepository.find({
      where: { user: { id: userId } },
      order: { createdAt: 'ASC' },
    });

    return entities.map((entity) => OauthAccountMapper.toDomain(entity));
  }

  async update(
    id: OauthAccount['id'],
    payload: Partial<OauthAccount>,
  ): Promise<OauthAccount> {
    const entity = await this.oauthAccountRepository.findOne({
      where: { id },
    });

    if (!entity) {
      throw new Error('Record not found');
    }

    const updatedEntity = await this.oauthAccountRepository.save(
      this.oauthAccountRepository.create(
        OauthAccountMapper.toPersistence({
          ...OauthAccountMapper.toDomain(entity),
          ...omitUndefined(payload),
        }),
      ),
    );

    return OauthAccountMapper.toDomain(updatedEntity);
  }

  async remove(id: OauthAccount['id']): Promise<void> {
    await this.oauthAccountRepository.delete(id);
  }
}
