import { describe, expect, it } from '@jest/globals';
import { LocaleContext, LocaleHolder } from './locale-context';

describe('LocaleContext', () => {
  describe('LocaleHolder resolution order', () => {
    it('should follow query/header > user > Accept-Language > default', () => {
      const holder = new LocaleHolder();
      expect(holder.locale).toBe('vi');

      holder.acceptLanguage = 'en';
      expect(holder.locale).toBe('en');

      holder.userLocale = 'vi';
      expect(holder.locale).toBe('vi');

      holder.explicit = 'en';
      expect(holder.locale).toBe('en');
    });
  });

  it('should expose the ambient locale inside run()', () => {
    const holder = new LocaleHolder();
    holder.explicit = 'en';

    LocaleContext.run(holder, () => {
      expect(LocaleContext.current()).toBe('en');
      expect(LocaleContext.holder()).toBe(holder);
    });
  });

  it('should reflect a holder mutated after run() started', () => {
    // The interceptor sets userLocale after the middleware opened the scope.
    const holder = new LocaleHolder();

    LocaleContext.run(holder, () => {
      expect(LocaleContext.current()).toBe('vi');
      holder.userLocale = 'en';
      expect(LocaleContext.current()).toBe('en');
    });
  });

  it('should survive await boundaries', async () => {
    const holder = new LocaleHolder();
    holder.explicit = 'en';

    await LocaleContext.run(holder, async () => {
      await Promise.resolve();
      expect(LocaleContext.current()).toBe('en');
    });
  });

  it('should fall back to the default locale outside any request', () => {
    // Seeds, the migration CLI and unit tests all run with no context.
    expect(LocaleContext.holder()).toBeUndefined();
    expect(LocaleContext.current()).toBe('vi');
  });

  it('should not leak a locale between concurrent requests', async () => {
    const first = new LocaleHolder();
    first.explicit = 'en';
    const second = new LocaleHolder();
    second.explicit = 'vi';

    const [a, b] = await Promise.all([
      LocaleContext.run(first, async () => {
        await new Promise((resolve) => setTimeout(resolve, 5));
        return LocaleContext.current();
      }),
      LocaleContext.run(second, async () => {
        await Promise.resolve();
        return LocaleContext.current();
      }),
    ]);

    expect(a).toBe('en');
    expect(b).toBe('vi');
  });
});
