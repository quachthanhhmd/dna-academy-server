import { describe, expect, it, beforeEach, jest } from '@jest/globals';
import { firstValueFrom, of } from 'rxjs';
import { UserLocaleInterceptor } from './user-locale.interceptor';
import { LocaleContext, LocaleHolder } from './locale-context';

describe('UserLocaleInterceptor', () => {
  let usersService: { findById: jest.Mock<any> };
  let interceptor: UserLocaleInterceptor;

  const setHeader = jest.fn();

  const contextFor = (user?: { id: number }) =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({ user }),
        getResponse: () => ({ setHeader }),
      }),
    }) as any;

  const next = { handle: () => of('payload') } as any;

  const invoke = async (holder: LocaleHolder, user?: { id: number }) =>
    LocaleContext.run(holder, () =>
      firstValueFrom(interceptor.intercept(contextFor(user), next)),
    );

  beforeEach(() => {
    setHeader.mockClear();
    usersService = { findById: jest.fn() };
    usersService.findById.mockResolvedValue({ id: 1, locale: 'en' });
    interceptor = new UserLocaleInterceptor(usersService as any);
  });

  it('should apply the stored user locale when the client sent none', async () => {
    const holder = new LocaleHolder();

    await invoke(holder, { id: 1 });

    expect(usersService.findById).toHaveBeenCalledWith(1);
    expect(holder.locale).toBe('en');
  });

  it('should not query the user when the client sent an explicit locale', async () => {
    const holder = new LocaleHolder();
    holder.explicit = 'vi';

    await invoke(holder, { id: 1 });

    expect(usersService.findById).not.toHaveBeenCalled();
    expect(holder.locale).toBe('vi');
  });

  it('should not query anything for an anonymous request', async () => {
    const holder = new LocaleHolder();

    await invoke(holder);

    expect(usersService.findById).not.toHaveBeenCalled();
  });

  it('should not mistake the passport-anonymous user for a real one', async () => {
    // AuthGuard(['jwt','anonymous']) sets request.user to the request object
    // itself, which is truthy but has no numeric id.
    const holder = new LocaleHolder();

    await invoke(holder, { id: undefined } as never);

    expect(usersService.findById).not.toHaveBeenCalled();
    expect(holder.locale).toBe('vi');
  });

  it('should outrank Accept-Language with the stored user locale', async () => {
    const holder = new LocaleHolder();
    holder.acceptLanguage = 'vi';

    await invoke(holder, { id: 1 });

    expect(holder.locale).toBe('en');
  });

  it('should ignore an unsupported stored locale', async () => {
    usersService.findById.mockResolvedValue({ id: 1, locale: 'fr' });
    const holder = new LocaleHolder();
    holder.acceptLanguage = 'en';

    await invoke(holder, { id: 1 });

    expect(holder.locale).toBe('en');
  });

  it('should not fail the request when the user lookup throws', async () => {
    usersService.findById.mockRejectedValue(new Error('db down'));
    const holder = new LocaleHolder();

    await expect(invoke(holder, { id: 1 })).resolves.toBe('payload');
    expect(holder.locale).toBe('vi');
  });

  it('should echo the resolved locale in Content-Language', async () => {
    const holder = new LocaleHolder();

    await invoke(holder, { id: 1 });

    expect(setHeader).toHaveBeenCalledWith('Content-Language', 'en');
  });

  it('should advertise that responses vary by locale inputs', async () => {
    await invoke(new LocaleHolder());

    expect(setHeader).toHaveBeenCalledWith(
      'Vary',
      'X-Locale, Accept-Language, Authorization',
    );
  });

  it('should vary on Authorization because the body depends on users.locale', async () => {
    // Public endpoints take an optional bearer token, so the same URL with the
    // same locale headers can resolve to different languages for different
    // callers. Without Authorization in Vary, a shared cache would hand one
    // signed-in user's language to everybody.
    await invoke(new LocaleHolder(), { id: 1 });

    const vary = setHeader.mock.calls.find(
      (call: unknown[]) => call[0] === 'Vary',
    )?.[1];
    expect(vary).toContain('Authorization');
  });
});
