/**
 * Catalog result ordering.
 *
 * `relevance` (Epic 4.4 §1.5) only means something against a search term; the
 * other five are properties of the row. `resolveCatalogSort` is what keeps the
 * two kinds from being mixed up.
 */
export const CATALOG_SORTS = [
  'newest',
  'most_popular',
  'highest_rated',
  'shortest',
  'longest',
  'relevance',
] as const;

export type CatalogSort = (typeof CATALOG_SORTS)[number];

export const DEFAULT_CATALOG_SORT: CatalogSort = 'newest';

/**
 * Epic 4.4 §1.5 — decides the effective sort from what the caller asked for
 * and whether they are searching.
 *
 * Two rules, both invisible when broken:
 *
 * 1. **No `sortBy` + a search term ⇒ `relevance`.** Otherwise `ts_rank` is
 *    computed and then discarded by an ORDER BY on `publishedAt`, and the
 *    tsvector's weights buy nothing. A search box that answers newest-first is
 *    not a search box.
 * 2. **`relevance` + no search term ⇒ `newest`.** Ranking a corpus against an
 *    empty query is meaningless, and `ts_rank` against an empty tsquery is a
 *    constant — an arbitrary order that looks deliberate.
 *
 * An explicit choice always wins. A user who picks "Newest" while searching
 * gets newest.
 */
export function resolveCatalogSort(
  sortBy: CatalogSort | null | undefined,
  hasSearchTerm: boolean,
): CatalogSort {
  if (!sortBy) {
    return hasSearchTerm ? 'relevance' : DEFAULT_CATALOG_SORT;
  }

  if (sortBy === 'relevance' && !hasSearchTerm) {
    return DEFAULT_CATALOG_SORT;
  }

  return sortBy;
}
