import { describe, expect, it, beforeEach, jest } from '@jest/globals';
import {
  BOOTSTRAP_ADMIN_EMAIL,
  SuperAdminSeedService,
} from './super-admin-seed.service';
import { RoleEnum } from '../../../../roles/roles.enum';

describe('SuperAdminSeedService', () => {
  let service: SuperAdminSeedService;
  let userRoles: Record<string, jest.Mock<any>>;
  let users: Record<string, jest.Mock<any>>;

  const admin = { id: 1, email: BOOTSTRAP_ADMIN_EMAIL };

  beforeEach(() => {
    userRoles = {
      count: (jest.fn() as jest.Mock<any>).mockResolvedValue(0),
      create: jest.fn((row: unknown) => row) as jest.Mock<any>,
      save: (jest.fn() as jest.Mock<any>).mockResolvedValue({ id: 'ur-1' }),
    };
    users = {
      findOne: (jest.fn() as jest.Mock<any>).mockResolvedValue(admin),
    };

    service = new SuperAdminSeedService(userRoles as never, users as never);
  });

  it('should grant Super Admin to the bootstrap admin when nobody holds it', async () => {
    await service.run();

    expect(userRoles.save).toHaveBeenCalledWith(
      expect.objectContaining({
        user: { id: 1 },
        role: { id: RoleEnum.superAdmin },
      }),
    );
  });

  it('should stamp assignedAt so the not-null column is satisfied', async () => {
    await service.run();

    const [row] = userRoles.create.mock.calls[0] as [Record<string, unknown>];
    expect(row.assignedAt).toBeInstanceOf(Date);
  });

  /**
   * The guard is "does anyone hold Super Admin", not "does this user hold it" —
   * so moving the role to a real person and revoking it from the seed account
   * is respected instead of being undone on the next boot.
   */
  it('should do nothing when some user already holds Super Admin', async () => {
    userRoles.count.mockResolvedValue(1);

    await service.run();

    expect(userRoles.save).not.toHaveBeenCalled();
  });

  it('should count Super Admin holders across all users, not just the seed account', async () => {
    await service.run();

    expect(userRoles.count).toHaveBeenCalledWith({
      where: { role: { id: RoleEnum.superAdmin } },
    });
  });

  it('should do nothing when the bootstrap admin does not exist', async () => {
    users.findOne.mockResolvedValue(null);

    await service.run();

    expect(userRoles.save).not.toHaveBeenCalled();
  });
});
