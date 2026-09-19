import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

export const RATE_LIMIT_METADATA_KEY = 'rate-limit';

/**
 * What a limit counts by.
 *
 * - `caller` — the signed-in user, or the client IP for an anonymous call.
 * - `ip` — the client IP. Scaled by `RATE_LIMIT_IP_MULTIPLIER`.
 * - `{ body }` — a request-body field, e.g. the email a login is for, so one
 *   account attacked from many addresses is still limited. Lower-cased and
 *   trimmed; a call without the field is not counted by this rule.
 * - `{ param }` — a route param, e.g. the instructor an invite goes to.
 */
export type RateLimitKey =
  | 'caller'
  | 'ip'
  | { body: string }
  | { param: string };

export type RateLimitOptions = {
  /** Calls allowed inside the window. */
  limit: number;
  /** Window length in milliseconds. */
  windowMs: number;
  by?: RateLimitKey;
};

/**
 * Caps how often a handler may be called. Stackable: every rule on a handler
 * must pass. See {@link RateLimitGuard}.
 */
export const RateLimit =
  (limit: number, windowMs: number, by: RateLimitKey = 'caller') =>
  (target: object, key?: string | symbol, descriptor?: PropertyDescriptor) => {
    const holder = descriptor?.value ?? target;
    const existing: RateLimitOptions[] =
      Reflect.getMetadata(RATE_LIMIT_METADATA_KEY, holder) ?? [];

    Reflect.defineMetadata(
      RATE_LIMIT_METADATA_KEY,
      [...existing, { limit, windowMs, by }],
      holder,
    );
  };

/**
 * Sliding-window limiter.
 *
 * The counters live in this process's memory: behind more than one API
 * instance each replica enforces the limit on its own, so the effective budget
 * multiplies by the replica count. That is fine for an abuse guard; a hard
 * quota would need a shared store.
 *
 * The client IP is `request.ip`, which is the proxy's address unless the app
 * trusts the proxy (`APP_TRUST_PROXY`). Without that, every caller behind a
 * load balancer shares one IP budget.
 */
@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly hits = new Map<string, number[]>();
  private readonly ipMultiplier = RateLimitGuard.readIpMultiplier();

  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const metadata = this.reflector.getAllAndOverride<
      RateLimitOptions | RateLimitOptions[] | undefined
    >(RATE_LIMIT_METADATA_KEY, [context.getHandler(), context.getClass()]);

    if (!metadata) {
      return true;
    }

    const rules = Array.isArray(metadata) ? metadata : [metadata];
    const http = context.switchToHttp();
    const request = http.getRequest();
    const now = Date.now();
    const scope = `${context.getClass().name}.${context.getHandler().name}`;

    // Check every rule before recording anything, so a refused call does not
    // use up the budget of the rules it passed.
    const checked = rules.flatMap((rule, index) => {
      const value = this.valueOf(rule.by ?? 'caller', request);

      if (value === undefined) {
        return [];
      }

      const limit =
        rule.by === 'ip' ? rule.limit * this.ipMultiplier : rule.limit;
      const cutoff = now - rule.windowMs;
      const key = `${scope}#${index}:${value}`;
      const recent = (this.hits.get(key) ?? []).filter((t) => t > cutoff);

      return [{ key, recent, limit, cutoff }];
    });

    const exceeded = checked.filter(
      ({ recent, limit }) => recent.length >= limit,
    );

    if (exceeded.length > 0) {
      const retryAfterSecs = Math.max(
        ...exceeded.map(({ recent, cutoff }) =>
          Math.ceil((recent[0] - cutoff) / 1000),
        ),
      );

      for (const { key, recent } of checked) {
        this.hits.set(key, recent);
      }

      http.getResponse?.()?.setHeader?.('Retry-After', String(retryAfterSecs));

      throw new HttpException(
        {
          status: HttpStatus.TOO_MANY_REQUESTS,
          code: 'RATE_LIMITED',
          retryAfterSecs,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    for (const { key, recent } of checked) {
      recent.push(now);
      this.hits.set(key, recent);
    }

    // Sweep occasionally so a long-lived process does not accumulate a key per
    // caller that never comes back.
    if (this.hits.size > 10_000) {
      this.sweep(now - Math.max(...rules.map((rule) => rule.windowMs)));
    }

    return true;
  }

  private valueOf(
    by: RateLimitKey,
    request: {
      ip?: string;
      user?: { id?: unknown };
      body?: Record<string, unknown>;
      params?: Record<string, unknown>;
    },
  ): string | undefined {
    if (by === 'caller') {
      return String(request?.user?.id ?? request?.ip ?? 'anonymous');
    }

    if (by === 'ip') {
      return request?.ip ?? 'anonymous';
    }

    const raw =
      'body' in by ? request?.body?.[by.body] : request?.params?.[by.param];

    if (typeof raw !== 'string' || !raw.trim()) {
      return undefined;
    }

    return 'body' in by ? raw.trim().toLowerCase() : raw;
  }

  private sweep(cutoff: number): void {
    for (const [key, timestamps] of this.hits) {
      if (timestamps.every((timestamp) => timestamp <= cutoff)) {
        this.hits.delete(key);
      }
    }
  }

  /**
   * `RATE_LIMIT_IP_MULTIPLIER` widens every IP rule — for a deployment whose
   * users share addresses, and for the e2e suite, where every request comes
   * from one machine. Defaults to 1.
   */
  private static readIpMultiplier(): number {
    const value = Number(process.env.RATE_LIMIT_IP_MULTIPLIER ?? 1);

    return Number.isFinite(value) && value >= 1 ? value : 1;
  }
}
