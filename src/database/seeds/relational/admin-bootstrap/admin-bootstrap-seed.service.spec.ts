import { afterEach, describe, expect, it, beforeEach } from '@jest/globals';
import {
  DEFAULT_BOOTSTRAP_ADMIN_EMAIL,
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
  const originalEmailVariable = process.env.ADMIN_BOOTSTRAP_EMAIL;

  beforeEach(() => {
    delete process.env.ADMIN_BOOTSTRAP_EMAIL;
    adminHolders = 0;
    bootstrapAccount = { id: 7, email: DEFAULT_BOOTSTRAP_ADMIN_EMAIL };
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

  afterEach(() => {
    if (originalEmailVariable === undefined) {
      delete process.env.ADMIN_BOOTSTRAP_EMAIL;
    } else {
      process.env.ADMIN_BOOTSTRAP_EMAIL = originalEmailVariable;
    }
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

  // Production never seeds the fixture account, so the real administrator is
  // named by the environment instead.
  it('should grant Admin to the account named by ADMIN_BOOTSTRAP_EMAIL', async () => {
    process.env.ADMIN_BOOTSTRAP_EMAIL = 'real.admin@dna.vn';
    bootstrapAccount = { id: 12, email: 'real.admin@dna.vn' };

    await service.run();

    expect(granted).toEqual([[12, 1, null]]);
  });

  // A stray space in an env file must not turn into a lookup that never matches.
  it('should trim ADMIN_BOOTSTRAP_EMAIL', async () => {
    process.env.ADMIN_BOOTSTRAP_EMAIL = '  real.admin@dna.vn  ';
    bootstrapAccount = { id: 12, email: 'real.admin@dna.vn' };

    await service.run();

    expect(granted).toEqual([[12, 1, null]]);
  });

  // An empty value is a variable someone declared and left blank; it must fall
  // back rather than search for the empty-string account.
  it('should fall back to the default when ADMIN_BOOTSTRAP_EMAIL is blank', async () => {
    process.env.ADMIN_BOOTSTRAP_EMAIL = '   ';

    await service.run();

    expect(granted).toEqual([[7, 1, null]]);
  });
});
