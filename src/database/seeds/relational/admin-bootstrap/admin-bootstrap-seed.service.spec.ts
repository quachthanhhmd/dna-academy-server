import { describe, expect, it, beforeEach } from '@jest/globals';
import {
  BOOTSTRAP_ADMIN_EMAIL,
  AdminBootstrapSeedService,
} from './admin-bootstrap-seed.service';

/**
 * Permission model §2.4 — a fresh instance needs one person who can pass
 * `PermissionGuard`, including on the route that assigns roles.
 */
describe('AdminBootstrapSeedService', () => {
  let service: AdminBootstrapSeedService;
  let adminHolders: number;
  let bootstrapAccount: { id: number; email: string } | null;
  let granted: Array<[number, number, number | null]>;

  beforeEach(() => {
    adminHolders = 0;
    bootstrapAccount = { id: 7, email: BOOTSTRAP_ADMIN_EMAIL };
    granted = [];

    const userRoles = {
      countByRoleId: (roleId: number) =>
        Promise.resolve(roleId === 1 ? adminHolders : 0),
      setRole: (userId: number, roleId: number, by: number | null) => {
        granted.push([userId, roleId, by]);
        return Promise.resolve();
      },
    };
    const users = {
      findOne: ({ where }: { where: { email: string } }) =>
        Promise.resolve(
          bootstrapAccount?.email === where.email ? bootstrapAccount : null,
        ),
    };

    service = new AdminBootstrapSeedService(userRoles as never, users as never);
  });

  it('should make the bootstrap account Admin when nobody holds Admin', async () => {
    await service.run();

    expect(granted).toEqual([[7, 1, null]]);
  });

  // Moving Admin to a real person and demoting the seed account must stick,
  // not be undone on the next boot.
  it('should do nothing once anybody holds Admin', async () => {
    adminHolders = 1;

    await service.run();

    expect(granted).toEqual([]);
  });

  it('should do nothing when the bootstrap account does not exist', async () => {
    bootstrapAccount = null;

    await service.run();

    expect(granted).toEqual([]);
  });
});
