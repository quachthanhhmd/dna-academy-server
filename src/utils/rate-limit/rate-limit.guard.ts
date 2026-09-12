import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

export const RATE_LIMIT_METADATA_KEY = 'rate-limit';

export type RateLimitOptions = {
  /** Calls allowed inside the window. */
  limit: number;
  /** Window length in milliseconds. */
  windowMs: number;
};

/** Caps how often one caller may hit a handler. See {@link RateLimitGuard}. */
export const RateLimit = (limit: number, windowMs: number) =>
  SetMetadata(RATE_LIMIT_METADATA_KEY, { limit, windowMs });

/**
 * Sliding-window limiter, keyed by authenticated user (falling back to the
 * client IP for anonymous calls) and by handler.
 *
 * The counters live in this process's memory: behind more than one API
 * instance each replica enforces the limit on its own, so the effective budget
 * multiplies by the replica count. That is fine for an abuse guard on a cheap
 * write like enrolment; a hard quota would need a shared store.
 */
@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly hits = new Map<string, number[]>();

  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const options = this.reflector.getAllAndOverride<
      RateLimitOptions | undefined
    >(RATE_LIMIT_METADATA_KEY, [context.getHandler(), context.getClass()]);

    if (!options) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const caller = request?.user?.id ?? request?.ip ?? 'anonymous';
    const key = `${context.getClass().name}.${context.getHandler().name}:${caller}`;

    const now = Date.now();
    const cutoff = now - options.windowMs;
    const recent = (this.hits.get(key) ?? []).filter(
      (timestamp) => timestamp > cutoff,
    );

    if (recent.length >= options.limit) {
      this.hits.set(key, recent);

      throw new HttpException(
        {
          status: HttpStatus.TOO_MANY_REQUESTS,
          code: 'RATE_LIMITED',
          retryAfterSecs: Math.ceil((recent[0] - cutoff) / 1000),
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    recent.push(now);
    this.hits.set(key, recent);

    // Sweep occasionally so a long-lived process does not accumulate a key per
    // caller that never comes back.
    if (this.hits.size > 10_000) {
      this.sweep(cutoff);
    }

    return true;
  }

  private sweep(cutoff: number): void {
    for (const [key, timestamps] of this.hits) {
      if (timestamps.every((timestamp) => timestamp <= cutoff)) {
        this.hits.delete(key);
      }
    }
  }
}
