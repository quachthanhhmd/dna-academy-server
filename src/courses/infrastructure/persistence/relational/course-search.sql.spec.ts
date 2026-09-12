import { describe, expect, it } from '@jest/globals';
import {
  COURSE_SEARCH_VECTOR_EXPRESSION,
  SEARCH_TERM_PARAM,
  VI_SEARCH_CONFIG,
  VI_SEARCH_QUERY_FN,
  searchMatchSql,
  searchQuerySql,
  searchRankSql,
  unaccentIlikeSql,
} from './course-search.sql';

/**
 * Epic 4.4 §1.5 — the SQL fragments the catalog search is built from.
 *
 * These are strings, so nothing here proves they *find* anything; the
 * behaviour lives in `test/user/course-catalog-search.e2e-spec.ts` against a
 * real Postgres. What is checked here is the pair of invariants that break
 * silently and that no query plan will complain about:
 *
 * - the ranking expression and the matching expression must be driven by the
 *   *same* tsquery, or rows are ranked against a query they were not selected
 *   by;
 * - `unaccent()` must wrap **both** sides of every ILIKE. Wrapping only the
 *   column makes `nguyen` miss `Nguyễn`; wrapping only the term makes
 *   `Nguyễn` miss itself. Either way it looks like it works, for one of the
 *   two inputs anyone will try.
 */
describe('course search SQL', () => {
  it('should pin the text search configuration and its query function', () => {
    expect(VI_SEARCH_CONFIG).toBe('vi_unaccent');
    expect(VI_SEARCH_QUERY_FN).toBe('vi_search_query');
  });

  it('should build the tsquery through the migration function, not inline', () => {
    // The prefix/negated-phrase handling lives in vi_search_query(); building
    // the tsquery inline is what re-introduces the 500 on `-"a b"`.
    expect(searchQuerySql()).toBe(`vi_search_query(:${SEARCH_TERM_PARAM})`);
  });

  it('should match the stored vector against that tsquery', () => {
    expect(searchMatchSql('course')).toBe(
      `course."search_vector" @@ ${searchQuerySql()}`,
    );
  });

  it('should rank against the identical tsquery it matched on', () => {
    expect(searchRankSql('course')).toContain(searchQuerySql());
    expect(searchRankSql('course')).toBe(
      `ts_rank(course."search_vector", ${searchQuerySql()})`,
    );
  });

  it('should unaccent both the column and the bound term', () => {
    const sql = unaccentIlikeSql('"i"."full_name"', 'searchLike');

    expect(sql).toBe('unaccent("i"."full_name") ILIKE unaccent(:searchLike)');
  });

  /**
   * A golden string, not a formatting preference.
   *
   * TypeORM does not read a generated column's expression back from Postgres —
   * it reads it from the `typeorm_metadata` row the migration wrote, and
   * compares that to the entity's `asExpression` character for character. Edit
   * this text without a migration that rewrites the row and every future
   * `migration:generate` emits a drop-and-recreate of `searchVector` and its
   * GIN index, on a table it has no reason to touch.
   *
   * If this test fails, the fix is a new migration — not a new expectation.
   */
  it('should keep the generation expression byte-identical to the migration', () => {
    expect(COURSE_SEARCH_VECTOR_EXPRESSION).toBe(
      `setweight(to_tsvector('vi_unaccent', coalesce("title", '')), 'A') || ` +
        `setweight(to_tsvector('vi_unaccent', coalesce("short_description", '')), 'B') || ` +
        `setweight(to_tsvector('vi_unaccent', coalesce("full_description", '')), 'C')`,
    );
  });

  it('should weight the title above the descriptions', () => {
    const weights = [...COURSE_SEARCH_VECTOR_EXPRESSION.matchAll(/'([ABC])'/g)];

    expect(weights.map((match) => match[1])).toEqual(['A', 'B', 'C']);
    expect(COURSE_SEARCH_VECTOR_EXPRESSION.indexOf('"title"')).toBeLessThan(
      COURSE_SEARCH_VECTOR_EXPRESSION.indexOf('"full_description"'),
    );
  });

  it('should build the vector with the same configuration the query uses', () => {
    expect(COURSE_SEARCH_VECTOR_EXPRESSION).toContain(`'${VI_SEARCH_CONFIG}'`);
  });

  it('should honour the alias it is given', () => {
    expect(searchMatchSql('c')).toContain('c."search_vector"');
    expect(searchRankSql('c')).toContain('c."search_vector"');
  });
});
