import { describe, expect, it } from '@jest/globals';
import { CATALOG_SORTS, resolveCatalogSort } from './catalog-sort';

/**
 * Epic 4.4 §1.5 — the one rule that decides whether the whole full-text search
 * was worth building.
 *
 * `ts_rank` is computed and then thrown away if the ORDER BY is still
 * `publishedAt`, so every weight in the tsvector is wasted unless `relevance`
 * becomes the default the moment a search term is present. And `relevance`
 * against an empty query ranks a corpus against nothing, so it has to degrade
 * back to `newest` when the term is cleared.
 *
 * Both halves are silent when wrong: results still come back, just in the
 * wrong order. That is why they are pulled out here rather than left inline.
 */
describe('resolveCatalogSort', () => {
  it('should list relevance as a valid sort', () => {
    expect(CATALOG_SORTS).toContain('relevance');
  });

  it('should default to newest when nothing was asked for', () => {
    expect(resolveCatalogSort(undefined, false)).toBe('newest');
    expect(resolveCatalogSort(null, false)).toBe('newest');
  });

  /** AC-2e — a header search lands with no `sortBy` and must rank. */
  it('should default to relevance when a search term is present', () => {
    expect(resolveCatalogSort(undefined, true)).toBe('relevance');
  });

  /** AC-2g — clearing the box must not leave a meaningless sort behind. */
  it('should degrade relevance to newest without a search term', () => {
    expect(resolveCatalogSort('relevance', false)).toBe('newest');
  });

  it('should keep relevance when a search term is present', () => {
    expect(resolveCatalogSort('relevance', true)).toBe('relevance');
  });

  /**
   * An explicit choice is never overridden. A user who picked "Newest" while
   * searching gets newest, not best-match — this is the difference between a
   * default and a rule.
   */
  it('should respect an explicit sort while searching', () => {
    expect(resolveCatalogSort('newest', true)).toBe('newest');
    expect(resolveCatalogSort('most_popular', true)).toBe('most_popular');
    expect(resolveCatalogSort('highest_rated', true)).toBe('highest_rated');
  });

  it('should respect an explicit sort without a search term', () => {
    expect(resolveCatalogSort('shortest', false)).toBe('shortest');
    expect(resolveCatalogSort('longest', false)).toBe('longest');
  });
});
