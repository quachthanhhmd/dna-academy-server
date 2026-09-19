import { HttpException, HttpStatus } from '@nestjs/common';

/** 10 failed logins per email per 15 minutes. */
export const LOGIN_FAILURE_LIMIT = 10;
export const LOGIN_FAILURE_WINDOW_MS = 15 * 60_000;

/**
 * Counts failed email logins per address, however many IPs they come from —
 * the per-IP limit on the route cannot see an attack spread across a botnet.
 *
 * Only failures count, and a success clears them, so someone who signs in
 * often is never locked out. The cost of the rule is that an attacker can
 * lock an address out for up to 15 minutes; the per-IP limit bounds how many
 * addresses one source can do that to.
 *
 * In-process memory, like RateLimitGuard: each API replica counts on its own.
 */
export class LoginFailureLimiter {
  private readonly failures = new Map<string, number[]>();

  assertAllowed(email: string): void {
    const recent = this.recent(email);

    if (recent.length >= LOGIN_FAILURE_LIMIT) {
      const retryAfterSecs = Math.ceil(
        (recent[0] + LOGIN_FAILURE_WINDOW_MS - Date.now()) / 1000,
      );

      throw new HttpException(
        {
          status: HttpStatus.TOO_MANY_REQUESTS,
          code: 'RATE_LIMITED',
          retryAfterSecs,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  recordFailure(email: string): void {
    const recent = this.recent(email);
    recent.push(Date.now());
    this.failures.set(LoginFailureLimiter.key(email), recent);

    if (this.failures.size > 10_000) {
      for (const [key, timestamps] of this.failures) {
        if (
          timestamps.every((t) => t <= Date.now() - LOGIN_FAILURE_WINDOW_MS)
        ) {
          this.failures.delete(key);
        }
      }
    }
  }

  clear(email: string): void {
    this.failures.delete(LoginFailureLimiter.key(email));
  }

  private recent(email: string): number[] {
    const cutoff = Date.now() - LOGIN_FAILURE_WINDOW_MS;

    return (this.failures.get(LoginFailureLimiter.key(email)) ?? []).filter(
      (t) => t > cutoff,
    );
  }

  private static key(email: string): string {
    return (email ?? '').trim().toLowerCase();
  }
}
