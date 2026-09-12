import { describe, expect, it } from '@jest/globals';
import { mergeIdFilters, parseIdList } from './parse-id-list';

/**
 * Epic 4.4 §1.2 — the plural catalog filters arrive as `?groupIds=a,b` or as
 * repeated `?groupIds=a&groupIds=b`, and both have to land on the same array.
 *
 * The important case is the empty one. `whitelist: true` drops params the DTO
 * does not declare *silently, with a 200*, and an empty array that reached the
 * repository would become `IN ()` — a filter that matches nothing while
 * looking like it matched everything. Empty must mean "no filter", which is
 * `undefined`, not `[]`.
 */
describe('parseIdList', () => {
  it('should leave an absent param absent', () => {
    expect(parseIdList(undefined)).toBeUndefined();
    expect(parseIdList(null)).toBeUndefined();
  });

  it('should treat an empty or blank value as no filter', () => {
    expect(parseIdList('')).toBeUndefined();
    expect(parseIdList('   ')).toBeUndefined();
    expect(parseIdList(',')).toBeUndefined();
    expect(parseIdList([])).toBeUndefined();
    expect(parseIdList(['', ' '])).toBeUndefined();
  });

  it('should split a CSV value', () => {
    expect(parseIdList('a,b,c')).toEqual(['a', 'b', 'c']);
  });

  it('should trim each entry and drop the blanks between separators', () => {
    expect(parseIdList(' a , ,b ,, c ')).toEqual(['a', 'b', 'c']);
  });

  it('should accept a repeated query param', () => {
    expect(parseIdList(['a', 'b'])).toEqual(['a', 'b']);
  });

  it('should accept CSV inside a repeated query param', () => {
    expect(parseIdList(['a,b', 'c'])).toEqual(['a', 'b', 'c']);
  });

  it('should de-duplicate, so a repeated id cannot skew a future count', () => {
    expect(parseIdList('a,b,a')).toEqual(['a', 'b']);
  });

  it('should preserve a single value as a one-element array', () => {
    expect(parseIdList('a')).toEqual(['a']);
  });

  /**
   * A number reaching here means someone sent something query strings cannot
   * produce. It is coerced rather than dropped so `@IsUUID` rejects it with a
   * 422 — dropping it would filter nothing and still answer 200.
   */
  it('should coerce a non-string scalar so validation can reject it', () => {
    expect(parseIdList(42 as unknown as string)).toEqual(['42']);
  });
});

/**
 * §1.2 — the singular params stay alive for one release. A live client, the
 * header route and every bookmarked catalog URL send them today.
 */
describe('mergeIdFilters', () => {
  it('should be no filter when neither form was sent', () => {
    expect(mergeIdFilters(undefined, undefined)).toBeUndefined();
  });

  it('should accept the plural form on its own', () => {
    expect(mergeIdFilters(['a', 'b'], undefined)).toEqual(['a', 'b']);
  });

  it('should accept the deprecated singular form on its own', () => {
    expect(mergeIdFilters(undefined, 'a')).toEqual(['a']);
  });

  it('should union both forms when a caller sends them together', () => {
    expect(mergeIdFilters(['a'], 'b')).toEqual(['a', 'b']);
  });

  it('should not duplicate an id sent in both forms', () => {
    expect(mergeIdFilters(['a', 'b'], 'a')).toEqual(['a', 'b']);
  });
});
