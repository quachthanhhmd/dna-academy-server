import { describe, expect, it, beforeEach, jest } from '@jest/globals';
import { Not } from 'typeorm';
import { SessionEntity } from '../entities/session.entity';
import { SessionRelationalRepository } from './session.repository';

/**
 * Sessions are hard-deleted. These tests exist because the alternative is
 * silent: a `softDelete` call compiles, passes a smoke test, and only shows
 * up later as a table where most rows are tombstones the auth path still has
 * to filter on every request.
 */
describe('SessionRelationalRepository deletes', () => {
  let repo: Record<string, jest.Mock<any>>;
  let subject: SessionRelationalRepository;

  beforeEach(() => {
    repo = {
      delete: (jest.fn() as jest.Mock<any>).mockResolvedValue({ affected: 1 }),
      softDelete: jest.fn() as jest.Mock<any>,
      findOne: jest.fn() as jest.Mock<any>,
      update: jest.fn() as jest.Mock<any>,
      save: jest.fn() as jest.Mock<any>,
      create: jest.fn((v) => v),
    };
    subject = new SessionRelationalRepository(repo as any);
  });

  it('should hard-delete one session by id', async () => {
    await subject.deleteById(7);

    expect(repo.delete).toHaveBeenCalledWith({ id: 7 });
    expect(repo.softDelete).not.toHaveBeenCalled();
  });

  it('should hard-delete every session of a user', async () => {
    await subject.deleteByUserId({ userId: 42 });

    expect(repo.delete).toHaveBeenCalledWith({ user: { id: 42 } });
    expect(repo.softDelete).not.toHaveBeenCalled();
  });

  it('should hard-delete a user other sessions while keeping the current one', async () => {
    // Password change: every other device is signed out, the device that
    // changed the password stays in.
    await subject.deleteByUserIdWithExclude({
      userId: 42,
      excludeSessionId: 9,
    });

    expect(repo.delete).toHaveBeenCalledWith({
      user: { id: 42 },
      id: Not(9),
    });
    expect(repo.softDelete).not.toHaveBeenCalled();
  });

  it('should coerce string ids to numbers before deleting', async () => {
    // Session ids arrive off a JWT payload, where they may be strings.
    await subject.deleteById('7' as unknown as number);

    expect(repo.delete).toHaveBeenCalledWith({ id: 7 });
  });

  it('should never call softDelete anywhere in the repository', () => {
    // A structural guard: anyone reintroducing the tombstone has to delete
    // this test and say why.
    const source = SessionRelationalRepository.prototype;
    const body = Object.getOwnPropertyNames(source)
      .map((name) => String(source[name as keyof typeof source]))
      .join('\n');

    expect(body).not.toContain('softDelete');
  });
});

describe('SessionEntity', () => {
  it('should not declare a soft-delete column', () => {
    // TypeORM only appends `deleted_at IS NULL` when the entity has a
    // DeleteDateColumn. If one came back while the database column stayed
    // dropped, every query would fail on a missing column.
    const columns = Reflect.getMetadata?.('design:type', SessionEntity) as
      | unknown
      | undefined;

    expect(columns).toBeUndefined();
    expect(Object.keys(new SessionEntity())).not.toContain('deletedAt');
  });
});
