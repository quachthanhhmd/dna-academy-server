import { Injectable } from '@nestjs/common';
import { omitUndefined } from '../../../../../utils/omit-undefined';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { SessionEntity } from '../entities/session.entity';
import { NullableType } from '../../../../../utils/types/nullable.type';

import { SessionRepository } from '../../session.repository';
import { Session } from '../../../../domain/session';

import { SessionMapper } from '../mappers/session.mapper';
import { User } from '../../../../../users/domain/user';

@Injectable()
export class SessionRelationalRepository implements SessionRepository {
  constructor(
    @InjectRepository(SessionEntity)
    private readonly sessionRepository: Repository<SessionEntity>,
  ) {}

  async findById(id: Session['id']): Promise<NullableType<Session>> {
    const entity = await this.sessionRepository.findOne({
      where: {
        id: Number(id),
      },
    });

    return entity ? SessionMapper.toDomain(entity) : null;
  }

  async create(data: Session): Promise<Session> {
    const persistenceModel = SessionMapper.toPersistence(data);
    return SessionMapper.toDomain(
      await this.sessionRepository.save(
        this.sessionRepository.create(persistenceModel),
      ),
    );
  }

  async update(
    id: Session['id'],
    payload: Partial<Omit<Session, 'id' | 'createdAt' | 'updatedAt'>>,
  ): Promise<Session | null> {
    const entity = await this.sessionRepository.findOne({
      where: { id: Number(id) },
    });

    if (!entity) {
      throw new Error('Session not found');
    }

    const updatedEntity = await this.sessionRepository.save(
      this.sessionRepository.create(
        SessionMapper.toPersistence({
          ...SessionMapper.toDomain(entity),
          ...omitUndefined(payload),
        }),
      ),
    );

    return SessionMapper.toDomain(updatedEntity);
  }

  async updateByHash(
    conditions: { id: Session['id']; hash: Session['hash'] },
    payload: Partial<Omit<Session, 'id' | 'createdAt' | 'updatedAt'>>,
  ): Promise<Session | null> {
    const result = await this.sessionRepository.update(
      { id: Number(conditions.id), hash: conditions.hash },
      { hash: payload.hash },
    );

    if (!result.affected) {
      return null;
    }

    const entity = await this.sessionRepository.findOne({
      where: { id: Number(conditions.id) },
    });

    return entity ? SessionMapper.toDomain(entity) : null;
  }

  /**
   * All three deletes are hard — see SessionEntity for why. The behaviour the
   * auth path depends on is unchanged: `updateByHash` already returned null
   * for a session that had been soft-deleted, because its follow-up
   * `findOne` filtered tombstones out. A row that is simply gone produces the
   * same null through `affected: 0`, one statement earlier.
   */
  async deleteById(id: Session['id']): Promise<void> {
    await this.sessionRepository.delete({
      id: Number(id),
    });
  }

  async deleteByUserId(conditions: { userId: User['id'] }): Promise<void> {
    await this.sessionRepository.delete({
      user: {
        id: Number(conditions.userId),
      },
    });
  }

  async deleteByUserIdWithExclude(conditions: {
    userId: User['id'];
    excludeSessionId: Session['id'];
  }): Promise<void> {
    await this.sessionRepository.delete({
      user: {
        id: Number(conditions.userId),
      },
      id: Not(Number(conditions.excludeSessionId)),
    });
  }
}
