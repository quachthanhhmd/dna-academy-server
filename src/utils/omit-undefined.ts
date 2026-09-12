/**
 * Drops keys whose value is `undefined`, keeping explicit `null`s.
 *
 * The generated repositories update by merging `{ ...current, ...payload }`.
 * The generated services build that payload by listing every column, so a
 * field the caller never mentioned arrives as `undefined` — and the spread
 * then overwrites the stored value with it. Passing the payload through here
 * first restores the meaning `Partial<T>` already claims: absent means "leave
 * it alone", `null` means "clear it".
 */
export const omitUndefined = <T extends object>(payload: T): Partial<T> =>
  Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value !== undefined),
  ) as Partial<T>;
