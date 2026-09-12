import { MigrationInterface, QueryRunner } from 'typeorm';
/**
 * The generation expression **as it was when this migration ran**, frozen here
 * as a literal rather than imported from `course-search.sql`.
 *
 * A migration describes a transition between two fixed schema states, so it
 * cannot depend on a constant the application is free to change: the columns
 * were still camelCase at this point in history, and
 * `RenameColumnsToSnakeCase` (which runs later) is what moves both the column
 * and the `typeorm_metadata` row to their snake_case spelling. Importing the
 * live constant would rewrite this migration's SQL every time that constant
 * moved, and a fresh database would fail here on columns that do not exist
 * yet.
 */
const COURSE_SEARCH_VECTOR_EXPRESSION =
  `setweight(to_tsvector('vi_unaccent', coalesce("title", '')), 'A') || ` +
  `setweight(to_tsvector('vi_unaccent', coalesce("shortDescription", '')), 'B') || ` +
  `setweight(to_tsvector('vi_unaccent', coalesce("fullDescription", '')), 'C')`;

/**
 * Epic 4.4 §1.5 — Vietnamese-aware full-text search for the course catalog.
 *
 * The catalog search was a single `ILIKE '%term%'` over the raw string, which
 * fails three ways, in the order a real user hits them:
 *
 * 1. `khoa hoc du lieu` matches nothing — the course is "Khoá học Dữ liệu",
 *    and Vietnamese users type without diacritics constantly. No amount of
 *    ILIKE fixes this; the strings genuinely differ.
 * 2. "genomic sequencing" misses "Sequencing the genome", because a substring
 *    match needs those words adjacent and in that order.
 * 3. A term buried in paragraph nine of `fullDescription` ranks exactly as
 *    high as the same term in the title.
 *
 * (1) is why this is worth a migration.
 *
 * ## Why `simple` and not a language configuration
 *
 * Postgres ships no Vietnamese stemmer, and Vietnamese is not an inflected
 * language, so there is nothing for a stemmer to do. What is actually needed
 * is tokenisation, lowercasing and diacritic folding — which is `simple` plus
 * `unaccent`.
 *
 * ## Why a text search configuration rather than calling unaccent()
 *
 * `unaccent()` called directly is STABLE, not IMMUTABLE, so it cannot appear
 * in a generated column or an index expression. Wrapped in a text search
 * configuration it can. The configuration is not decoration — it is the only
 * way this column can exist.
 *
 * ## Why a generated column rather than a trigger
 *
 * A generated column can never drift from its row: there is no trigger to
 * forget on a new write path and no backfill to run, because the `ALTER`
 * computes every existing row. The table is small enough that the rewrite is
 * instant.
 *
 * ## What changes for users
 *
 * Mid-word substrings stop matching. `%nomic%` used to find "genomic"; a
 * tokenised index will not, because it indexes words. Real queries start at
 * word boundaries so this is the right trade, but it is a behaviour change
 * rather than a pure upgrade and belongs in the release note.
 */
export class AddCourseFullTextSearch1787000000000 implements MigrationInterface {
  name = 'AddCourseFullTextSearch1787000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS unaccent`);

    await queryRunner.query(
      `CREATE TEXT SEARCH CONFIGURATION vi_unaccent (COPY = simple)`,
    );
    await queryRunner.query(
      `ALTER TEXT SEARCH CONFIGURATION vi_unaccent
         ALTER MAPPING FOR hword, hword_part, word WITH unaccent, simple`,
    );

    /**
     * The parser for user input, wrapped so the query side can never 500.
     *
     * `websearch_to_tsquery` is the right parser: it accepts "quoted phrases",
     * `or` and `-excluded`, and unlike `to_tsquery` it never throws on
     * malformed input — a user typing `c++ (` must not produce a 500.
     *
     * The prefix match on the final token is what makes an as-you-type field
     * useful: `genom` finds "Genomics" while the user is still typing. Earlier
     * tokens stay exact so results do not thrash as the query grows.
     *
     * The two guarded branches are the reason this is a function rather than
     * `(q::text || ':*')::tsquery` inline, which is what the epic's draft SQL
     * proposed:
     *
     * - an empty query (`''`, `"`, only stop words) would become `':*'`, a
     *   syntax error;
     * - a query ending in a negated phrase renders as `!( 'a' <-> 'b' )`, and
     *   `!( 'a' <-> 'b' ):*` is also a syntax error. `-"khoa hoc"` is a
     *   perfectly ordinary thing to type, and it would have been a 500.
     *
     * IMMUTABLE is honest here: `websearch_to_tsquery(regconfig, text)` is
     * immutable, and every other operation is pure text handling.
     */
    await queryRunner.query(
      `CREATE OR REPLACE FUNCTION vi_search_query(term text) RETURNS tsquery
         LANGUAGE sql IMMUTABLE STRICT PARALLEL SAFE AS $$
           SELECT CASE
                    WHEN q IS NULL OR q::text = ''      THEN q
                    WHEN right(q::text, 1) = ')'        THEN q
                    ELSE (q::text || ':*')::tsquery
                  END
             FROM websearch_to_tsquery('vi_unaccent', term) AS q
         $$`,
    );

    // Weighted A/B/C so a title match outranks a long-description match for
    // the same term (AC-2d). ts_rank reads the weights off the vector, so the
    // ordering is decided here rather than at query time.
    await queryRunner.query(
      `ALTER TABLE "course" ADD COLUMN "searchVector" tsvector
         GENERATED ALWAYS AS (${COURSE_SEARCH_VECTOR_EXPRESSION}) STORED`,
    );

    await queryRunner.query(
      `CREATE INDEX "IDX_course_search_vector" ON "course" USING GIN ("searchVector")`,
    );

    /**
     * Register the column with TypeORM.
     *
     * This is not bookkeeping — without it `npm run migration:generate` fails
     * for the **whole project**, not just this table. On loading the schema,
     * TypeORM sees `is_generated = ALWAYS` in `information_schema` and then
     * reads the expression out of `typeorm_metadata`, because Postgres'
     * normalised `generation_expression` is not comparable to what an entity
     * declares. This project has never had that table (no views, no generated
     * columns until now), so the read errors and the command dies.
     *
     * The stored `value` must match `CourseEntity.searchVector`'s
     * `asExpression` character for character; both are the same frozen
     * constant, pinned by `course-search.sql.spec.ts`.
     */
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "typeorm_metadata" (
         "type"     character varying NOT NULL,
         "database" character varying,
         "schema"   character varying,
         "table"    character varying,
         "name"     character varying,
         "value"    text
       )`,
    );

    await queryRunner.query(
      `INSERT INTO "typeorm_metadata"
         ("type", "database", "schema", "table", "name", "value")
       VALUES ('GENERATED_COLUMN', current_database(), current_schema(), 'course', 'searchVector', $1)`,
      [COURSE_SEARCH_VECTOR_EXPRESSION],
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Reverse order: the column's generation expression depends on the
    // configuration, so the configuration cannot be dropped first.
    await queryRunner.query(
      `DELETE FROM "typeorm_metadata"
        WHERE "type" = 'GENERATED_COLUMN'
          AND "table" = 'course'
          AND "name" = 'searchVector'`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_course_search_vector"`);
    await queryRunner.query(
      `ALTER TABLE "course" DROP COLUMN IF EXISTS "searchVector"`,
    );
    await queryRunner.query(`DROP FUNCTION IF EXISTS vi_search_query(text)`);
    await queryRunner.query(
      `DROP TEXT SEARCH CONFIGURATION IF EXISTS vi_unaccent`,
    );
    // `typeorm_metadata` is left in place alongside `unaccent`: it is TypeORM's
    // own table, not this migration's, and a later generated column or view
    // will need it.
    //
    // `unaccent` is deliberately left installed. Dropping an extension is not
    // this migration's to reverse — it may predate us or another migration may
    // have come to depend on it, and an idle extension costs nothing.
  }
}
