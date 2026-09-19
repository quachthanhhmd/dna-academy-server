import {
  describe,
  expect,
  it,
  beforeEach,
  afterEach,
  jest,
} from '@jest/globals';
import { ExecutionContext, HttpException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RateLimit, RateLimitGuard } from './rate-limit.guard';

const MINUTE = 60_000;

/**
 * Several limits on one route, each counted by its own key — the shape the
 * auth endpoints need: a login is limited per email (one account attacked
 * from many addresses) and per IP (many accounts from one address).
 */
class AuthLikeController {
  @RateLimit(3, 15 * MINUTE, { body: 'email' })
  @RateLimit(5, 15 * MINUTE, 'ip')
  login() {}

  @RateLimit(2, 60 * MINUTE, { param: 'id' })
  invite() {}
}

describe('RateLimitGuard — several rules per route', () => {
  let guard: RateLimitGuard;
  let now: number;
  let headers: Record<string, string>;

  const call = (
    handler: 'login' | 'invite',
    opts: { ip?: string; email?: string; id?: string; user?: unknown } = {},
  ) =>
    guard.canActivate({
      getHandler: () => AuthLikeController.prototype[handler],
      getClass: () => AuthLikeController,
      switchToHttp: () => ({
        getRequest: () => ({
          ip: opts.ip ?? '10.0.0.1',
          user: opts.user,
          body: { email: opts.email },
          params: { id: opts.id },
        }),
        getResponse: () => ({
          setHeader: (name: string, value: string) => {
            headers[name] = value;
          },
        }),
      }),
    } as unknown as ExecutionContext);

  const refused = (fn: () => unknown): HttpException | undefined => {
    try {
      fn();
    } catch (error) {
      return error as HttpException;
    }
    return undefined;
  };

  beforeEach(() => {
    now = 5_000_000;
    headers = {};
    jest.spyOn(Date, 'now').mockImplementation(() => now);
    delete process.env.RATE_LIMIT_IP_MULTIPLIER;
    guard = new RateLimitGuard(new Reflector());
  });

  afterEach(() => {
    jest.restoreAllMocks();
    delete process.env.RATE_LIMIT_IP_MULTIPLIER;
  });

  // One account guessed at from many addresses.
  it('should limit one email across different IPs', () => {
    for (let i = 0; i < 3; i += 1) {
      call('login', { email: 'victim@example.com', ip: `10.0.1.${i}` });
    }

    const error = refused(() =>
      call('login', { email: 'victim@example.com', ip: '10.0.9.9' }),
    );

    expect(error?.getStatus()).toBe(429);
  });

  it('should treat an email case-insensitively and ignore surrounding spaces', () => {
    for (let i = 0; i < 3; i += 1) {
      call('login', { email: 'Victim@Example.com', ip: `10.0.1.${i}` });
    }

    expect(
      refused(() =>
        call('login', { email: '  victim@example.com ', ip: '10.0.2.1' }),
      ),
    ).toBeInstanceOf(HttpException);
  });

  // Many accounts sprayed from one address.
  it('should limit one IP across different emails', () => {
    for (let i = 0; i < 5; i += 1) {
      call('login', { email: `user${i}@example.com` });
    }

    expect(
      refused(() => call('login', { email: 'user9@example.com' }))?.getStatus(),
    ).toBe(429);
  });

  it('should let another email through while one is limited', () => {
    for (let i = 0; i < 3; i += 1) {
      call('login', { email: 'victim@example.com', ip: `10.0.1.${i}` });
    }

    expect(call('login', { email: 'other@example.com', ip: '10.0.3.1' })).toBe(
      true,
    );
  });

  it('should tell the client when to retry, in the body and the header', () => {
    for (let i = 0; i < 3; i += 1) {
      call('login', { email: 'victim@example.com', ip: `10.0.1.${i}` });
    }
    now += 5 * MINUTE;

    const error = refused(() =>
      call('login', { email: 'victim@example.com', ip: '10.0.4.1' }),
    );

    expect(error?.getResponse()).toEqual({
      status: 429,
      code: 'RATE_LIMITED',
      retryAfterSecs: 600,
    });
    expect(headers['Retry-After']).toBe('600');
  });

  it('should limit by a route param', () => {
    call('invite', { id: 'instr-1', user: { id: 1 } });
    call('invite', { id: 'instr-1', user: { id: 2 } });

    expect(
      refused(() => call('invite', { id: 'instr-1', user: { id: 3 } })),
    ).toBeInstanceOf(HttpException);
    expect(call('invite', { id: 'instr-2', user: { id: 1 } })).toBe(true);
  });

  // A school behind one NAT, or the e2e suite on one machine.
  it('should scale IP limits by RATE_LIMIT_IP_MULTIPLIER', () => {
    process.env.RATE_LIMIT_IP_MULTIPLIER = '2';
    guard = new RateLimitGuard(new Reflector());

    for (let i = 0; i < 10; i += 1) {
      call('login', { email: `user${i}@example.com` });
    }

    expect(
      refused(() => call('login', { email: 'user99@example.com' })),
    ).toBeInstanceOf(HttpException);
  });

  // A refused call must not also use up the other rules' budget.
  it('should not count a refused call against the other rules', () => {
    for (let i = 0; i < 3; i += 1) {
      call('login', { email: 'victim@example.com' });
    }
    refused(() => call('login', { email: 'victim@example.com' }));
    refused(() => call('login', { email: 'victim@example.com' }));

    // IP budget: 3 used, 2 left.
    expect(call('login', { email: 'a@example.com' })).toBe(true);
    expect(call('login', { email: 'b@example.com' })).toBe(true);
  });
});
