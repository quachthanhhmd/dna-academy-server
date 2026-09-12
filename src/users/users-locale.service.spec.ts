import { describe, expect, it, beforeEach, jest } from '@jest/globals';
import { UsersService } from './users.service';

/**
 * Epic 6 — the preferred UI locale must survive UsersService.update.
 *
 * `update` builds an explicit field whitelist, so a newly added column is
 * silently dropped unless it is listed. This spec pins that.
 */
describe('UsersService — locale', () => {
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

  it('should forward a locale change to the repository', async () => {
    await service.update(1, { locale: 'en' } as any);

    expect(usersRepository.update).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ locale: 'en' }),
    );
  });

  it('should leave the stored locale alone when the field is omitted', async () => {
    await service.update(1, { fullName: 'New Name' } as any);

    const payload = usersRepository.update.mock.calls[0][1] as Record<
      string,
      unknown
    >;
    expect(payload.locale).toBeUndefined();
  });

  it('should default a new user to the platform default locale', async () => {
    await service.create({ email: 'a@b.c', password: 'x' } as any);

    expect(usersRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ locale: 'vi' }),
    );
  });

  it('should honour an explicit locale at creation', async () => {
    await service.create({
      email: 'a@b.c',
      password: 'x',
      locale: 'en',
    } as any);

    expect(usersRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ locale: 'en' }),
    );
  });
});
