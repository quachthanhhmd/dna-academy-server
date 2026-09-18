import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository, In } from 'typeorm';
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

  async setRole(
    userId: UserRole['user']['id'],
    roleId: UserRole['role']['id'],
    assignedById: UserRole['user']['id'] | null,
    manager?: EntityManager,
  ): Promise<void> {
    const write = async (em: EntityManager) => {
      // An upsert on UX_user_role_user, not delete-then-insert: two
      // concurrent changes for one user then serialise on the row instead of
      // racing to insert a second one.
      await em.query(
        `INSERT INTO "user_role" ("user_id", "role_id", "assigned_by_id", "assigned_at")
         VALUES ($1, $2, $3, now())
         ON CONFLICT ("user_id") DO UPDATE
            SET "role_id" = EXCLUDED."role_id",
                "assigned_by_id" = EXCLUDED."assigned_by_id",
                "assigned_at" = EXCLUDED."assigned_at",
                "updated_at" = now()`,
        [userId, roleId, assignedById],
      );
      await em.query(`UPDATE "user" SET "role_id" = $2 WHERE "id" = $1`, [
        userId,
        roleId,
      ]);
    };

    if (manager) {
      await write(manager);
      return;
    }

    await this.userRoleRepository.manager.transaction(write);
  }
}
