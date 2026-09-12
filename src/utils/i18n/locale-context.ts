import { AsyncLocalStorage } from 'node:async_hooks';
import { DEFAULT_LOCALE } from './locale';

/**
 * Mutable per-request locale state.
 *
 * The middleware fills in what it can see before the auth guard runs
 * (`?locale=`, `X-Locale`, `Accept-Language`); the interceptor fills in
 * `userLocale` afterwards. Because the holder is a single mutable object held
 * by AsyncLocalStorage, that later write is visible to everything downstream —
 * including the static entity mappers.
 */
export class LocaleHolder {
  /** `?locale=` or `X-Locale` — an explicit client override. */
  explicit?: string;

  /** `users.locale` of the authenticated caller. */
  userLocale?: string;

  /** Best supported match from the `Accept-Language` header. */
  acceptLanguage?: string;

  /** Epic 6 §2.2.1 precedence chain. */
  get locale(): string {
    return (
      this.explicit ?? this.userLocale ?? this.acceptLanguage ?? DEFAULT_LOCALE
    );
  }
}

const storage = new AsyncLocalStorage<LocaleHolder>();

export const LocaleContext = {
  run<T>(holder: LocaleHolder, fn: () => T): T {
    return storage.run(holder, fn);
  },

  holder(): LocaleHolder | undefined {
    return storage.getStore();
  },

  /**
   * Ambient locale for the current request. Outside a request — seeds, the
   * TypeORM CLI, unit tests — there is no store and the default locale wins,
   * which keeps mappers deterministic in those contexts.
   */
  current(): string {
    return storage.getStore()?.locale ?? DEFAULT_LOCALE;
  },
};
