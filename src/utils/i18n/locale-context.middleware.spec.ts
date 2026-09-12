import { describe, expect, it, jest } from '@jest/globals';
import { LocaleContextMiddleware } from './locale-context.middleware';
import { LocaleContext } from './locale-context';

describe('LocaleContextMiddleware', () => {
  const middleware = new LocaleContextMiddleware();

  const run = (req: any) => {
    let seen:
      | { locale: string; explicit?: string; accept?: string }
      | undefined;
    const request = { query: {}, headers: {}, ...req };

    middleware.use(request as any, {} as any, () => {
      const holder = LocaleContext.holder()!;
      seen = {
        locale: holder.locale,
        explicit: holder.explicit,
        accept: holder.acceptLanguage,
      };
    });

    return { seen: seen!, request };
  };

  it('should treat ?locale= as an explicit override', () => {
    const { seen } = run({ query: { locale: 'en' } });

    expect(seen.explicit).toBe('en');
    expect(seen.locale).toBe('en');
  });

  it('should read the X-Locale header when no query param is present', () => {
    const { seen } = run({ headers: { 'x-locale': 'en' } });

    expect(seen.explicit).toBe('en');
  });

  it('should prefer ?locale= over X-Locale', () => {
    const { seen } = run({
      query: { locale: 'vi' },
      headers: { 'x-locale': 'en' },
    });

    expect(seen.locale).toBe('vi');
  });

  it('should record Accept-Language without marking it explicit', () => {
    const { seen } = run({
      headers: { 'accept-language': 'en-US,en;q=0.9,vi;q=0.5' },
    });

    expect(seen.explicit).toBeUndefined();
    expect(seen.accept).toBe('en');
    expect(seen.locale).toBe('en');
  });

  it('should ignore an unsupported explicit locale and fall through', () => {
    const { seen } = run({
      query: { locale: 'fr' },
      headers: { 'accept-language': 'en' },
    });

    expect(seen.explicit).toBeUndefined();
    expect(seen.locale).toBe('en');
  });

  it('should default to vi when nothing is supplied', () => {
    expect(run({}).seen.locale).toBe('vi');
  });

  it('should normalise a regional tag', () => {
    expect(run({ query: { locale: 'vi-VN' } }).seen.explicit).toBe('vi');
  });

  it('should tolerate a repeated ?locale= array value', () => {
    expect(run({ query: { locale: ['en', 'vi'] } }).seen.explicit).toBe('en');
  });

  it('should always call next exactly once', () => {
    const next = jest.fn();
    middleware.use({ query: {}, headers: {} } as any, {} as any, next);

    expect(next).toHaveBeenCalledTimes(1);
  });
});
