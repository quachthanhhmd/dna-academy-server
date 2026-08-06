import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { RolePermissionEntity } from '../entities/role-permission.entity';
import { NullableType } from '../../../../../utils/types/nullable.type';
import { RolePermission } from '../../../../domain/role-permission';
import { RolePermissionRepository } from '../../role-permission.repository';
import { RolePermissionMapper } from '../mappers/role-permission.mapper';
import { IPaginationOptions } from '../../../../../utils/types/pagination-options';

@Injectable()
export class RolePermissionRelationalRepository implements RolePermissionRepository {
  constructor(
    @InjectRepository(RolePermissionEntity)
    private readonly rolePermissionRepository: Repository<RolePermissionEntity>,
  ) {}

  async create(data: RolePermission): Promise<RolePermission> {
    const persistenceModel = RolePermissionMapper.toPersistence(data);
    const newEntity = await this.rolePermissionRepository.save(
      this.rolePermissionRepository.create(persistenceModel),
    );
    return RolePermissionMapper.toDomain(newEntity);
  }

  async findAllWithPagination({
    paginationOptions,
  }: {
    paginationOptions: IPaginationOptions;
  }): Promise<RolePermission[]> {
    const entities = await this.rolePermissionRepository.find({
      skip: (paginationOptions.page - 1) * paginationOptions.limit,
      take: paginationOptions.limit,
    });

    return entities.map((entity) => RolePermissionMapper.toDomain(entity));
  }

  async findById(
    id: RolePermission['id'],
  ): Promise<NullableType<RolePermission>> {
    const entity = await this.rolePermissionRepository.findOne({
      where: { id },
    });

    return entity ? RolePermissionMapper.toDomain(entity) : null;
  }

  async findByIds(ids: RolePermission['id'][]): Promise<RolePermission[]> {
    const entities = await this.rolePermissionRepository.find({
      where: { id: In(ids) },
    });

    return entities.map((entity) => RolePermissionMapper.toDomain(entity));
  }

  async update(
    id: RolePermission['id'],
    payload: Partial<RolePermission>,
  ): Promise<RolePermission> {
    const entity = await this.rolePermissionRepository.findOne({
      where: { id },
    });

    if (!entity) {
      throw new Error('Record not found');
    }

    const updatedEntity = await this.rolePermissionRepository.save(
      this.rolePermissionRepository.create(
        RolePermissionMapper.toPersistence({
          ...RolePermissionMapper.toDomain(entity),
          ...payload,
        }),
      ),
    );

    return RolePermissionMapper.toDomain(updatedEntity);
  }

  async remove(id: RolePermission['id']): Promise<void> {
    await this.rolePermissionRepository.delete(id);
  }
}
