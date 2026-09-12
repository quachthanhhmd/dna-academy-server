/**
 * Epic 4.4 §1.5 — SQL fragments for the catalog's Vietnamese-aware full-text
 * search. Kept in one file so the query side and the migration that built the
 * index cannot drift: if the tsvector is built with `vi_unaccent` and the
 * query is parsed with `simple`, `khoa hoc` stops finding "Khoá học" and
 * nothing errors.
 *
 * See `AddCourseFullTextSearch...` for the configuration, the generated
 * `searchVector` column, the GIN index and `vi_search_query()`.
 */

/**
 * `simple` + `unaccent`, not a language configuration. Postgres ships no
 * Vietnamese stemmer, and Vietnamese is not inflected, so there is nothing for
 * a stemmer to do — what is needed is tokenisation, lowercasing and
 * diacritic folding.
 */
export const VI_SEARCH_CONFIG = 'vi_unaccent';

/**
 * The IMMUTABLE wrapper around `websearch_to_tsquery` created by the
 * migration. It also decides where the `:*` prefix may be appended, which is
 * not a detail: appending it blindly to the query text — as the epic's draft
 * SQL does — raises `syntax error in tsquery` on any input ending in a negated
 * phrase (`-"a b"` renders as `!( 'a' <-> 'b' )`), i.e. a user-typed 500.
 */
export const VI_SEARCH_QUERY_FN = 'vi_search_query';

/** Bound parameter carrying the raw, untouched user input. */
export const SEARCH_TERM_PARAM = 'searchTerm';

/** Bound parameter carrying the `%term%` form for the ILIKE fallbacks. */
export const SEARCH_LIKE_PARAM = 'searchLike';

/**
 * Select alias the relevance sort orders by.
 *
 * Ordering by the `ts_rank(...)` expression directly does not work: TypeORM
 * resolves an `orderBy` string by splitting it on '.', so it reads
 * `ts_rank(course."search_vector", …)` as an alias named `ts_rank(course` and
 * throws "alias was not found" on every search. Selecting the rank under an
 * alias and ordering by that also survives the DISTINCT sub-query TypeORM
 * wraps a paginated join query in — where a bare expression would be dropped.
 */
export const CATALOG_RANK_ALIAS = 'catalog_rank';

/**
 * The generation expression behind `course."search_vector"`.
 *
 * **This string is frozen.** It is the literal the migration wrote into
 * `typeorm_metadata`, and TypeORM compares the entity's `asExpression` against
 * that row character for character to decide whether the column has changed.
 * Editing it here without a new migration that rewrites the metadata row makes
 * every `migration:generate` emit a drop-and-recreate of the column and its
 * GIN index. `course-search.sql.spec.ts` pins the exact text for that reason.
 *
 * Weights: A title, B short description, C full description — which is what
 * makes a title match outrank a body match for the same term.
 */
export const COURSE_SEARCH_VECTOR_EXPRESSION =
  `setweight(to_tsvector('vi_unaccent', coalesce("title", '')), 'A') || ` +
  `setweight(to_tsvector('vi_unaccent', coalesce("short_description", '')), 'B') || ` +
  `setweight(to_tsvector('vi_unaccent', coalesce("full_description", '')), 'C')`;

/** The tsquery for the caller's term. Never throws — see `VI_SEARCH_QUERY_FN`. */
export const searchQuerySql = (param: string = SEARCH_TERM_PARAM): string =>
  `${VI_SEARCH_QUERY_FN}(:${param})`;

/** Indexed predicate: the GIN index on `searchVector` answers this one. */
export const searchMatchSql = (
  alias: string,
  param: string = SEARCH_TERM_PARAM,
): string => `${alias}."search_vector" @@ ${searchQuerySql(param)}`;

/**
 * Ranking expression for `sortBy=relevance`. Must be driven by the same
 * tsquery as `searchMatchSql`, or rows are ordered by a query they were not
 * selected by.
 */
export const searchRankSql = (
  alias: string,
  param: string = SEARCH_TERM_PARAM,
): string => `ts_rank(${alias}."search_vector", ${searchQuerySql(param)})`;

/**
 * Diacritic-insensitive ILIKE for the columns a generated tsvector cannot
 * reach — instructor name/headline and category name live in other tables
 * (§1.5, "what FTS does not cover").
 *
 * Unaccenting **both** sides is the whole point: with only the column wrapped,
 * a user typing `Nguyễn` finds nothing; with only the term wrapped, `nguyen`
 * finds nothing. These matches stay unindexed and unranked, which is
 * acceptable at this corpus size and is the documented trade.
 */
export const unaccentIlikeSql = (column: string, param: string): string =>
  `unaccent(${column}) ILIKE unaccent(:${param})`;
