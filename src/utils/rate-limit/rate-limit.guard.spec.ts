import { describe, expect, it, beforeEach, jest } from '@jest/globals';
import { ExecutionContext, HttpException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RATE_LIMIT_METADATA_KEY, RateLimitGuard } from './rate-limit.guard';

describe('RateLimitGuard', () => {
  let guard: RateLimitGuard;
  let reflector: Reflector;
  let now: number;

  const handler = () => undefined;

  const context = (user: unknown, ip = '10.0.0.1'): ExecutionContext =>
    ({
      getHandler: () => handler,
      getClass: () => class Ctrl {},
      switchToHttp: () => ({ getRequest: () => ({ user, ip }) }),
    }) as unknown as ExecutionContext;

  beforeEach(() => {
    now = 1_000_000;
    jest.spyOn(Date, 'now').mockImplementation(() => now);

    reflector = new Reflector();
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockImplementation((key: unknown) =>
        key === RATE_LIMIT_METADATA_KEY
          ? ({ limit: 3, windowMs: 60_000 } as never)
          : (undefined as never),
      );

    guard = new RateLimitGuard(reflector);
  });

  it('should let an unannotated route through', () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue(undefined as never);

    expect(guard.canActivate(context({ id: 1 }))).toBe(true);
  });

  it('should allow calls up to the limit and reject the next one', () => {
    const ctx = context({ id: 1 });

    expect(guard.canActivate(ctx)).toBe(true);
    expect(guard.canActivate(ctx)).toBe(true);
    expect(guard.canActivate(ctx)).toBe(true);

    let thrown: unknown;
    try {
      guard.canActivate(ctx);
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(HttpException);
    expect((thrown as HttpException).getStatus()).toBe(429);
  });

  it('should count each user separately', () => {
    const a = context({ id: 1 });
    const b = context({ id: 2 });

    for (let i = 0; i < 3; i += 1) {
      expect(guard.canActivate(a)).toBe(true);
    }

    expect(guard.canActivate(b)).toBe(true);
  });

  it('should fall back to the client ip when there is no user', () => {
    const a = context(undefined, '10.0.0.1');
    const b = context(undefined, '10.0.0.2');

    for (let i = 0; i < 3; i += 1) {
      expect(guard.canActivate(a)).toBe(true);
    }

    expect(() => guard.canActivate(a)).toThrow();
    expect(guard.canActivate(b)).toBe(true);
  });

  it('should forget calls once the window has passed', () => {
    const ctx = context({ id: 1 });

    for (let i = 0; i < 3; i += 1) {
      guard.canActivate(ctx);
    }
    expect(() => guard.canActivate(ctx)).toThrow();

    now += 60_001;
    expect(guard.canActivate(ctx)).toBe(true);
  });
});
