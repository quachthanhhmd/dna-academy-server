import { Injectable } from '@nestjs/common';
import { omitUndefined } from '../../../../../utils/omit-undefined';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { UserRoleEntity } from '../entities/user-role.entity';
import { NullableType } from '../../../../../utils/types/nullable.type';
import { UserRole } from '../../../../domain/user-role';
import { UserRoleRepository } from '../../user-role.repository';
import { UserRoleMapper } from '../mappers/user-role.mapper';
import { IPaginationOptions } from '../../../../../utils/types/pagination-options';

@Injectable()
export class UserRoleRelationalRepository implements UserRoleRepository {
  constructor(
    @InjectRepository(UserRoleEntity)
    private readonly userRoleRepository: Repository<UserRoleEntity>,
  ) {}

  async create(data: UserRole): Promise<UserRole> {
    const persistenceModel = UserRoleMapper.toPersistence(data);
    const newEntity = await this.userRoleRepository.save(
      this.userRoleRepository.create(persistenceModel),
    );
    return UserRoleMapper.toDomain(newEntity);
  }

  async findAllWithPagination({
    paginationOptions,
  }: {
    paginationOptions: IPaginationOptions;
  }): Promise<UserRole[]> {
    const entities = await this.userRoleRepository.find({
      skip: (paginationOptions.page - 1) * paginationOptions.limit,
      take: paginationOptions.limit,
    });

    return entities.map((entity) => UserRoleMapper.toDomain(entity));
  }

  async findById(id: UserRole['id']): Promise<NullableType<UserRole>> {
    const entity = await this.userRoleRepository.findOne({
      where: { id },
    });

    return entity ? UserRoleMapper.toDomain(entity) : null;
  }

  async findByIds(ids: UserRole['id'][]): Promise<UserRole[]> {
    const entities = await this.userRoleRepository.find({
      where: { id: In(ids) },
    });

    return entities.map((entity) => UserRoleMapper.toDomain(entity));
  }

  async findByUserId(userId: UserRole['user']['id']): Promise<UserRole[]> {
    const entities = await this.userRoleRepository.find({
      where: { user: { id: userId } },
    });

    return entities.map((entity) => UserRoleMapper.toDomain(entity));
  }

  async countByRoleId(roleId: UserRole['role']['id']): Promise<number> {
    return this.userRoleRepository.count({
      where: { role: { id: roleId } },
    });
  }

  async removeByUserId(userId: UserRole['user']['id']): Promise<void> {
    await this.userRoleRepository.delete({ user: { id: userId } });
  }

  async update(
    id: UserRole['id'],
    payload: Partial<UserRole>,
  ): Promise<UserRole> {
    const entity = await this.userRoleRepository.findOne({
      where: { id },
    });

    if (!entity) {
      throw new Error('Record not found');
    }

    const updatedEntity = await this.userRoleRepository.save(
      this.userRoleRepository.create(
        UserRoleMapper.toPersistence({
          ...UserRoleMapper.toDomain(entity),
          ...omitUndefined(payload),
        }),
      ),
    );

    return UserRoleMapper.toDomain(updatedEntity);
  }

  async remove(id: UserRole['id']): Promise<void> {
    await this.userRoleRepository.delete(id);
  }
}
