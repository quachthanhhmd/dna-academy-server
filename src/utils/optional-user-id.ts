/**
 * Reads the authenticated user id off a request guarded by
 * `AuthGuard(['jwt', 'anonymous'])`.
 *
 * The anonymous passport strategy resolves `request.user` to the request
 * object itself rather than to `undefined`, so a plain `request.user?.id`
 * check is not enough to tell "signed in" from "anonymous". Requiring a
 * numeric id keeps unauthenticated callers from being mistaken for a user.
 */
export function optionalUserId(request: unknown): number | undefined {
  const user = (request as { user?: { id?: unknown } } | undefined)?.user;

  return typeof user?.id === 'number' ? user.id : undefined;
}
