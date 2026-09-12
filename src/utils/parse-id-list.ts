/**
 * Normalises a repeatable/CSV id query param into a de-duplicated array.
 *
 * Epic 4.4 §1.2 — the catalog's plural filters (`groupIds`, `categoryIds`,
 * `levelIds`, `instructorIds`) accept both `?groupIds=a,b` and the repeated
 * `?groupIds=a&groupIds=b`, because a client library may serialise either.
 *
 * Empty resolves to `undefined`, never `[]`: an empty array reaching the
 * repository would build `IN ()`, a filter that matches nothing while the
 * caller believes it filtered nothing. "No values" and "no filter" are the
 * same thing here.
 *
 * A non-string scalar is coerced rather than discarded so `@IsUUID` can reject
 * it with a 422. Dropping it would leave the request unfiltered and still
 * answer 200, which is the failure mode this whole epic is trying to avoid.
 */
export function parseIdList(
  value: string | string[] | null | undefined,
): string[] | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  const raw = Array.isArray(value) ? value : [value];

  const ids = raw
    .flatMap((entry) => String(entry).split(','))
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);

  return ids.length ? [...new Set(ids)] : undefined;
}

/**
 * Folds a deprecated singular param into its plural replacement.
 *
 * §1.2 keeps `groupId` &co. working for one release: bookmarked and shared
 * catalog URLs use them today, and `whitelist: true` would drop them without a
 * word. A caller sending both wins nothing by it — the values are unioned.
 */
export function mergeIdFilters(
  plural: string[] | undefined,
  singular: string | undefined,
): string[] | undefined {
  const merged = [...(plural ?? []), ...(singular ? [singular] : [])];

  return merged.length ? [...new Set(merged)] : undefined;
}
