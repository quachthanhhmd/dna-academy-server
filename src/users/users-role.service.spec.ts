import { describe, expect, it, beforeEach, jest } from '@jest/globals';
import { UsersService } from './users.service';

/**
 * Permission model §2.5 — `UserRolesService.setRole` is the only writer of a
 * user's role. A role reaching the user row any other way — an admin form, a
 * request body the validation pipe let through — would bypass the role
 * endpoint's rules (last admin, instructor with courses, own role) and leave
 * `user_role` and `user.role_id` disagreeing.
 */
describe('UsersService — role', () => {
  let service: UsersService;
  let usersRepository: {
    create: jest.Mock<any>;
    update: jest.Mock<any>;
    findById: jest.Mock<any>;
    findByEmail: jest.Mock<any>;
  };

  beforeEach(() => {
    usersRepository = {
      create: (jest.fn() as jest.Mock<any>).mockResolvedValue({ id: 1 }),
      update: (jest.fn() as jest.Mock<any>).mockResolvedValue({ id: 1 }),
      findById: (jest.fn() as jest.Mock<any>).mockResolvedValue({ id: 1 }),
      findByEmail: (jest.fn() as jest.Mock<any>).mockResolvedValue(null),
    };

    service = new UsersService(usersRepository as any, {} as any);
  });

  const written = (mock: jest.Mock<any>, arg: number) =>
    mock.mock.calls[0][arg] as Record<string, unknown>;

  it('should not write a role when creating a user', async () => {
    await service.create({
      email: 'a@example.com',
      firstName: 'A',
      lastName: 'B',
      role: { id: 1 },
    } as any);

    expect(written(usersRepository.create, 0).role).toBeUndefined();
  });

  it('should not write a role when updating a user', async () => {
    await service.update(1, { role: { id: 1 } } as any);

    expect(written(usersRepository.update, 1).role).toBeUndefined();
  });

  // user.social_id is superseded by oauth_account (§2.8).
  it('should not write the legacy social id', async () => {
    await service.create({
      email: 'a@example.com',
      firstName: 'A',
      lastName: 'B',
      socialId: 'google-1',
    } as any);

    expect(written(usersRepository.create, 0).socialId).toBeUndefined();
  });
});
