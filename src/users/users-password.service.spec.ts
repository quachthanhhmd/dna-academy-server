import { describe, expect, it, beforeEach, jest } from '@jest/globals';
import { UsersService } from './users.service';

/**
 * Removing a password is its own method, not `update({ password: null })`.
 *
 * `update` is fed straight from HTTP bodies (PATCH /auth/me, PATCH /users/:id),
 * and `@IsOptional()` lets a JSON `null` through validation. If null meant
 * "remove" there, a request carrying `{ "password": null }` would wipe a
 * password without ever reaching the old-password check.
 */
describe('UsersService — password', () => {
  let service: UsersService;
  let usersRepository: {
    update: jest.Mock<any>;
    findById: jest.Mock<any>;
    findByEmail: jest.Mock<any>;
  };

  const payloadSent = () =>
    usersRepository.update.mock.calls[0][1] as Record<string, unknown>;

  beforeEach(() => {
    usersRepository = {
      update: (jest.fn() as jest.Mock<any>).mockResolvedValue({ id: 1 }),
      findById: (jest.fn() as jest.Mock<any>).mockResolvedValue({
        id: 1,
        password: '$2a$10$existingHash',
      }),
      findByEmail: (jest.fn() as jest.Mock<any>).mockResolvedValue(null),
    };

    service = new UsersService(usersRepository as any, {} as any);
  });

  it('should clear the stored password', async () => {
    await service.clearPassword(1);

    expect(usersRepository.update).toHaveBeenCalledWith(1, { password: null });
  });

  // Guard: the HTTP-facing path must never treat null as "remove".
  it('should ignore a null password passed to update', async () => {
    await service.update(1, { password: null } as any);

    expect(payloadSent().password).toBeUndefined();
  });

  // Guard: omitting the field must not wipe anyone's password.
  it('should leave the stored password alone when the field is omitted', async () => {
    await service.update(1, { fullName: 'New Name' } as any);

    expect(payloadSent().password).toBeUndefined();
  });

  // Guard: a new password is still hashed, never stored as given.
  it('should store a hash, not the plaintext, when given a new password', async () => {
    await service.update(1, { password: 'new-secret' } as any);

    expect(payloadSent().password).toEqual(
      expect.stringMatching(/^\$2[aby]\$/),
    );
  });
});
