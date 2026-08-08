import { describe, expect, it, beforeEach, jest } from '@jest/globals';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { PermissionGuard } from './permission.guard';

describe('PermissionGuard', () => {
  let guard: PermissionGuard;
  let reflector: { getAllAndOverride: jest.Mock<any> };
  let userRolesService: { findByUserId: jest.Mock<any> };
  let rolePermissionsService: { findByRoleId: jest.Mock<any> };

  const makeContext = (user: unknown): ExecutionContext => {
    return {
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as unknown as ExecutionContext;
  };

  beforeEach(() => {
    reflector = { getAllAndOverride: jest.fn() };
    userRolesService = { findByUserId: jest.fn() };
    rolePermissionsService = { findByRoleId: jest.fn() };

    guard = new PermissionGuard(
      reflector as any,
      userRolesService as any,
      rolePermissionsService as any,
    );
  });

  it('should allow the request when the route has no @RequirePermission metadata', async () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);

    await expect(guard.canActivate(makeContext({ id: 1 }))).resolves.toBe(true);
    expect(userRolesService.findByUserId).not.toHaveBeenCalled();
  });

  it('should deny when there is no authenticated user on the request', async () => {
    reflector.getAllAndOverride.mockReturnValue({
      module: 'roles',
      action: 'view',
    });

    await expect(guard.canActivate(makeContext(undefined))).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('should deny when the user has no assigned roles', async () => {
    reflector.getAllAndOverride.mockReturnValue({
      module: 'roles',
      action: 'view',
    });
    userRolesService.findByUserId.mockResolvedValue([]);

    await expect(guard.canActivate(makeContext({ id: 1 }))).rejects.toThrow(
      ForbiddenException,
    );
  });

  it("should deny when the user's roles do not grant the required (module, action)", async () => {
    reflector.getAllAndOverride.mockReturnValue({
      module: 'roles',
      action: 'delete',
    });
    userRolesService.findByUserId.mockResolvedValue([{ role: { id: 5 } }]);
    rolePermissionsService.findByRoleId.mockResolvedValue([
      { permission: { module: { name: 'roles' }, action: 'view' } },
    ]);

    await expect(guard.canActivate(makeContext({ id: 1 }))).rejects.toThrow(
      ForbiddenException,
    );
  });

  it("should allow when one of the user's roles grants the required (module, action)", async () => {
    reflector.getAllAndOverride.mockReturnValue({
      module: 'roles',
      action: 'delete',
    });
    userRolesService.findByUserId.mockResolvedValue([{ role: { id: 5 } }]);
    rolePermissionsService.findByRoleId.mockResolvedValue([
      { permission: { module: { name: 'roles' }, action: 'view' } },
      { permission: { module: { name: 'roles' }, action: 'delete' } },
    ]);

    await expect(guard.canActivate(makeContext({ id: 1 }))).resolves.toBe(true);
  });

  it('should allow when the permission comes from a second assigned role (union across roles)', async () => {
    reflector.getAllAndOverride.mockReturnValue({
      module: 'master_data',
      action: 'edit',
    });
    userRolesService.findByUserId.mockResolvedValue([
      { role: { id: 5 } },
      { role: { id: 6 } },
    ]);
    rolePermissionsService.findByRoleId.mockImplementation((roleId: number) =>
      Promise.resolve(
        roleId === 6
          ? [
              {
                permission: {
                  module: { name: 'master_data' },
                  action: 'edit',
                },
              },
            ]
          : [
              {
                permission: { module: { name: 'roles' }, action: 'view' },
              },
            ],
      ),
    );

    await expect(guard.canActivate(makeContext({ id: 1 }))).resolves.toBe(true);
    expect(rolePermissionsService.findByRoleId).toHaveBeenCalledWith(5);
    expect(rolePermissionsService.findByRoleId).toHaveBeenCalledWith(6);
  });
});
