import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';

const MAX_ERROR_LENGTH = 500;

/**
 * Logs one line per request as `time [METHOD] api status duration <error>`.
 *
 * Registered from AppModule only when NODE_ENV=development, so production and
 * test runs stay silent. It runs as middleware rather than an interceptor so
 * that responses which never reach a handler — guard rejections (403), failed
 * validation (422) and unmatched routes (404) — are logged too.
 */
@Injectable()
export class ApiLoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger('API');

  use(req: Request, res: Response, next: NextFunction): void {
    const startedAt = Date.now();
    let errorBody: unknown;

    // Exception filters serialise through res.json() after res.status(), so by
    // the time this runs the status code is final and the payload is the error.
    const originalJson = res.json.bind(res);
    res.json = ((payload: unknown) => {
      if (res.statusCode >= 400) {
        errorBody = payload;
      }
      return originalJson(payload);
    }) as Response['json'];

    res.on('finish', () => {
      const line = [
        new Date().toISOString(),
        `[${req.method}]`,
        req.originalUrl,
        res.statusCode,
        `${Date.now() - startedAt}ms`,
      ].join(' ');

      if (res.statusCode < 400) {
        this.logger.log(line);
        return;
      }

      const error = this.formatError(errorBody);
      this.logger.error(error ? `${line} ${error}` : line);
    });

    next();
  }

  private formatError(body: unknown): string {
    if (body === undefined || body === null) {
      return '';
    }

    const text = typeof body === 'string' ? body : this.stringify(body);

    return text.length > MAX_ERROR_LENGTH
      ? `${text.slice(0, MAX_ERROR_LENGTH)}…`
      : text;
  }

  private stringify(body: unknown): string {
    try {
      return JSON.stringify(body);
    } catch {
      // Circular or otherwise unserialisable payload — the status code above
      // is still logged, which is the part that matters.
      return '[unserialisable error body]';
    }
  }
}
