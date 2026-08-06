import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { PermissionEntity } from '../entities/permission.entity';
import { NullableType } from '../../../../../utils/types/nullable.type';
import { Permission } from '../../../../domain/permission';
import { PermissionRepository } from '../../permission.repository';
import { PermissionMapper } from '../mappers/permission.mapper';
import { IPaginationOptions } from '../../../../../utils/types/pagination-options';

@Injectable()
export class PermissionRelationalRepository implements PermissionRepository {
  constructor(
    @InjectRepository(PermissionEntity)
    private readonly permissionRepository: Repository<PermissionEntity>,
  ) {}

  async create(data: Permission): Promise<Permission> {
    const persistenceModel = PermissionMapper.toPersistence(data);
    const newEntity = await this.permissionRepository.save(
      this.permissionRepository.create(persistenceModel),
    );
    return PermissionMapper.toDomain(newEntity);
  }

  async findAllWithPagination({
    paginationOptions,
  }: {
    paginationOptions: IPaginationOptions;
  }): Promise<Permission[]> {
    const entities = await this.permissionRepository.find({
      skip: (paginationOptions.page - 1) * paginationOptions.limit,
      take: paginationOptions.limit,
    });

    return entities.map((entity) => PermissionMapper.toDomain(entity));
  }

  async findById(id: Permission['id']): Promise<NullableType<Permission>> {
    const entity = await this.permissionRepository.findOne({
      where: { id },
    });

    return entity ? PermissionMapper.toDomain(entity) : null;
  }

  async findByIds(ids: Permission['id'][]): Promise<Permission[]> {
    const entities = await this.permissionRepository.find({
      where: { id: In(ids) },
    });

    return entities.map((entity) => PermissionMapper.toDomain(entity));
  }

  async update(
    id: Permission['id'],
    payload: Partial<Permission>,
  ): Promise<Permission> {
    const entity = await this.permissionRepository.findOne({
      where: { id },
    });

    if (!entity) {
      throw new Error('Record not found');
    }

    const updatedEntity = await this.permissionRepository.save(
      this.permissionRepository.create(
        PermissionMapper.toPersistence({
          ...PermissionMapper.toDomain(entity),
          ...payload,
        }),
      ),
    );

    return PermissionMapper.toDomain(updatedEntity);
  }

  async remove(id: Permission['id']): Promise<void> {
    await this.permissionRepository.delete(id);
  }
}
