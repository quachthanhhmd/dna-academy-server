import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, from, switchMap } from 'rxjs';
import { UsersService } from '../../users/users.service';
import { LocaleContext } from './locale-context';
import { normalizeLocale } from './locale';
import { optionalUserId } from '../optional-user-id';

/**
 * Completes the Epic 6 §2.2.1 chain by contributing `users.locale`, which the
 * middleware cannot see because it runs before the auth guard.
 *
 * The lookup is skipped entirely when the client sent `?locale=` or
 * `X-Locale` — which the FE always does — so the extra query only happens for
 * authenticated callers that expressed no preference.
 */
@Injectable()
export class UserLocaleInterceptor implements NestInterceptor {
  private readonly logger = new Logger(UserLocaleInterceptor.name);

  constructor(private readonly usersService: UsersService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    // Public routes guarded by AuthGuard(['jwt','anonymous']) set
    // `request.user` to the request object itself for anonymous callers, so a
    // truthiness check is not enough — see optionalUserId.
    const userId = optionalUserId(http.getRequest());
    const holder = LocaleContext.holder();

    const response = http.getResponse();
    // Public master-data and catalog responses are cacheable and their body now
    // depends on these request headers.
    //
    // `Authorization` is in the list because the public endpoints accept an
    // OPTIONAL bearer token: the same URL with the same locale headers can
    // resolve to a different language depending on the caller's stored
    // users.locale. Without it a shared cache could hand one signed-in user's
    // language to every anonymous visitor. Anonymous requests all share the
    // header's absence, so they still share one cache entry per locale.
    response?.setHeader?.('Vary', 'X-Locale, Accept-Language, Authorization');

    const applyUserLocale = async (): Promise<void> => {
      if (!holder || holder.explicit || !userId) {
        return;
      }

      try {
        const user = await this.usersService.findById(userId);
        holder.userLocale = normalizeLocale(user?.locale);
      } catch (error) {
        // Locale is a display concern — never fail a request over it.
        this.logger.warn(`Could not resolve locale for user ${userId}`, error);
      }
    };

    return from(applyUserLocale()).pipe(
      switchMap(() => {
        response?.setHeader?.(
          'Content-Language',
          holder?.locale ?? LocaleContext.current(),
        );
        return next.handle();
      }),
    );
  }
}
