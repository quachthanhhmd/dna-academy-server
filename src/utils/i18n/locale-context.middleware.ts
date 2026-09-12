import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { LocaleContext, LocaleHolder } from './locale-context';
import { normalizeLocale, parseAcceptLanguage } from './locale';

/**
 * Opens the per-request locale scope (Epic 6 §2.2.1).
 *
 * This runs as middleware — i.e. before the auth guard — so it can only see
 * what is on the wire. `users.locale` is filled in later by
 * `UserLocaleInterceptor`, which mutates the same holder.
 */
@Injectable()
export class LocaleContextMiddleware implements NestMiddleware {
  use(req: Request, _res: Response, next: NextFunction): void {
    const holder = new LocaleHolder();

    const queryLocale = req.query?.locale;
    holder.explicit =
      normalizeLocale(
        Array.isArray(queryLocale)
          ? String(queryLocale[0])
          : (queryLocale as string),
      ) ?? normalizeLocale(req.headers?.['x-locale'] as string);

    holder.acceptLanguage = parseAcceptLanguage(
      req.headers?.['accept-language'],
    );

    LocaleContext.run(holder, () => next());
  }
}
