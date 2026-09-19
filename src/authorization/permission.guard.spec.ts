import { describe, expect, it, beforeEach } from '@jest/globals';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { PermissionGuard } from './permission.guard';

describe('PermissionGuard', () => {
  let required: { module: string; action: string } | undefined;
  let granted: Map<number, string[]>;
  let asked: Array<[number, string, string]>;
  let guard: PermissionGuard;

  const context = (user: unknown): ExecutionContext =>
    ({
      switchToHttp: () => ({ getRequest: () => ({ user }) }),
      getHandler: () => ({}),
      getClass: () => ({}),
    }) as unknown as ExecutionContext;

  beforeEach(() => {
    required = { module: 'users', action: 'edit' };
    granted = new Map([[7, ['users:edit']]]);
    asked = [];

    guard = new PermissionGuard(
      { getAllAndOverride: () => required } as never,
      {
        hasPermission: (userId: number, module: string, action: string) => {
          asked.push([userId, module, action]);
          return Promise.resolve(
            (granted.get(userId) ?? []).includes(`${module}:${action}`),
          );
        },
      } as never,
    );
  });

  it('should let a route without @RequirePermission through without a lookup', async () => {
    required = undefined;

    await expect(guard.canActivate(context({ id: 7 }))).resolves.toBe(true);
    expect(asked).toEqual([]);
  });

  it('should allow a user holding the required permission', async () => {
    await expect(guard.canActivate(context({ id: 7 }))).resolves.toBe(true);
    expect(asked).toEqual([[7, 'users', 'edit']]);
  });

  it('should deny a user without it, naming what was required', async () => {
    const error = await guard.canActivate(context({ id: 8 })).catch((e) => e);

    expect(error).toBeInstanceOf(ForbiddenException);
    expect(error.getResponse()).toEqual({
      code: 'PERMISSION_DENIED',
      required: { module: 'users', action: 'edit' },
    });
  });

  it('should deny a request with no authenticated user', async () => {
    await expect(guard.canActivate(context(undefined))).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(asked).toEqual([]);
  });
});
