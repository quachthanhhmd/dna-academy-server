import { describe, expect, it } from '@jest/globals';
import { RoleEntity } from '../../../../../roles/infrastructure/persistence/relational/entities/role.entity';
import { StatusEntity } from '../../../../../statuses/infrastructure/persistence/relational/entities/status.entity';
import { UserEntity } from '../entities/user.entity';
import { UserMapper } from './user.mapper';

/*
  The mapper's job is to stop persistence objects crossing into the domain, and
  for `role` and `status` it used to assign them straight across. That is not a
  style point: EntityRelationalHelper stamps `__entity` on every entity in
  @AfterLoad, so `GET /auth/me` answered with `role: { ..., __entity:
  "RoleEntity" }`, and any column added to RoleEntity later would have shipped
  to every client with nobody reviewing it.

  `setEntityName()` is called by hand here because @AfterLoad only fires on a
  real load, and a fixture built in a test would otherwise not reproduce the
  bug this guards.
*/
const role = (): RoleEntity => {
  const entity = Object.assign(new RoleEntity(), {
    id: 2,
    name: 'User',
    description: 'An internal note nobody outside should read',
    isActive: true,
  });
  entity.setEntityName();
  return entity;
};

const status = (): StatusEntity => {
  const entity = Object.assign(new StatusEntity(), { id: 1, name: 'Active' });
  entity.setEntityName();
  return entity;
};

const userEntity = (overrides: Partial<UserEntity> = {}): UserEntity =>
  Object.assign(new UserEntity(), {
    id: 3,
    locale: 'vi',
    onboardingDone: true,
    age: null,
    dateOfBirth: null,
    profilePictureUrl: null,
    emailVerified: true,
    fullName: 'Thanh Quach',
    email: 'student@example.com',
    password: '$2a$10$storedPasswordHash',
    provider: 'email',
    socialId: null,
    firstName: 'Thanh',
    lastName: 'Quach',
    role: role(),
    status: status(),
    createdAt: new Date('2026-10-03T07:21:17.543Z'),
    updatedAt: new Date('2026-10-03T07:22:40.450Z'),
    deletedAt: null,
    ...overrides,
  });

describe('UserMapper', () => {
  describe('toDomain', () => {
    it('should not carry the persistence entity name into role or status', () => {
      const domain = UserMapper.toDomain(userEntity());

      expect(domain.role).not.toHaveProperty('__entity');
      expect(domain.status).not.toHaveProperty('__entity');
    });

    it('should pass only id and name out of role', () => {
      const domain = UserMapper.toDomain(userEntity());

      expect(domain.role).toEqual({ id: 2, name: 'User' });
    });

    it('should pass only id and name out of status', () => {
      const domain = UserMapper.toDomain(userEntity());

      expect(domain.status).toEqual({ id: 1, name: 'Active' });
    });

    // An account can exist before a role is attached; mapping must not invent one.
    it('should leave a missing role missing', () => {
      const domain = UserMapper.toDomain(
        userEntity({ role: null as unknown as RoleEntity }),
      );

      expect(domain.role).toBeFalsy();
    });
  });
});
