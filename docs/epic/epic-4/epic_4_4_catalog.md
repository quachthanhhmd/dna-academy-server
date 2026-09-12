# Epic 4.4 — Course Search & Catalog (`STU_CAT_03`)

> **Renumbered from your draft's "4.3", which is taken** by curriculum access & completion
> state ([`epic_4_3.md`](./epic_4_3.md)). Same folder, next number — journey work stays here.
>
> **Verified against both working trees on 07/09/2026.** The draft is written as a greenfield
> build; most of it already exists and works. This plan is the *delta*, so the team does not
> spend a week rebuilding a screen that ships today. Every claim names the file and line.
>
> **Effort: ~3½ days, not 7.** §0 is why — and half a day of that is the full-text search in
> §1.5, which the draft did not have.
>
> Three parts, in the order they should be read: [§1 API integration](#1-api-integration) is the
> contract, [§2 Backend](#2-backend-work) and [§3 Frontend](#3-frontend-work) are written
> against it.

---

## 0. Reality check — what already ships

| Draft item | Status | Evidence |
|---|---|---|
| `search` across title / short / full description | ✅ built | `course.repository.ts:99-106` |
| `search` across instructor name **and headline** | ✅ built (BE-2 done) | `course.repository.ts:107-112`, joins `course_instructor` + `instructor` |
| `groupId`, `categoryId`, `levelId`, `instructorId` filters | ✅ built, **singular** | `find-courses-catalog.dto.ts`, `course.repository.ts:119-148` |
| `isFree`, `minPrice`/`maxPrice`, `language`, `minRating`, duration range, `hasCertificate` | ✅ built | `find-courses-catalog.dto.ts`, `course.repository.ts:150-195` |
| All five sorts, `NULLS LAST` | ✅ built (BE-4 done) | `course.repository.ts:199-216` |
| Deterministic pagination tiebreak | ✅ built, **not in the draft** | `course.repository.ts:219` — `addOrderBy('course.id')`, without which pages repeat rows |
| Response envelope `{data,totalCount,page,limit,hasNextPage}` | ✅ exact | `course-card.dto.ts:56-73` |
| Hard cap 50 (BE-5) | ✅ built | `CATALOG_MAX_LIMIT` in `course-catalog.service.ts:12,25` |
| Instructor lookup batched, no N+1 | ✅ built | `course-catalog.service.ts:50-55` |
| Filter store with page-reset-on-change (FE-16 part) | ✅ built | `use-course-filter-store.ts:62-65` |
| Sidebar, sort dropdown, pagination, skeleton, empty, result count, course card | ✅ built | `src/components/catalog/*`, `courses/page-content.tsx` |
| Master data for the three groups, localized | ✅ built | `page-content.tsx:57-64`, `useMasterDataStore` |

**Of the draft's 8 BE tasks, 6 are already done.** Of the 19 FE tasks, 11 are.

### What is actually missing or wrong

| # | Gap | Sev |
|---|---|---|
| G1 | **Every filter is single-select** on both sides; the draft wants multi. This is the real work. | P1 |
| G2 | **No debounce anywhere in the client** — `grep -rn "debounce" src` returns nothing. Typing "genomic" fires 7 catalog requests. | P1 |
| G3 | **No URL sync.** Refresh or share a filtered catalog and it resets. The draft's AC-10 fails today. | P1 |
| G4 | **Header search does not reach the catalog.** `Header.tsx:55-58` scrolls to `#free-courses` on the landing page; it never routes to `/courses?search=`. | P1 |
| G5 | No category pills. | P2 |
| G6 | Card payload lacks `language`, `groupIds`, `hasPreview`. | P2 |
| G7 | **"Enrolled" overlay is impossible today** — see §1.4, it needs a decision, not code. | P2 |
| G8 | Duration presets: three in code (`short`/`medium`/`long`), four in the draft. | P3 |
| G9 | **Search is a raw `ILIKE '%term%'`** — multi-word queries miss, diacritics are absolute (`khoa hoc` finds nothing), and nothing is ranked. Not in the draft; replaced by full-text search in §1.5. | **P1** |

---

## 1. API integration

> **Shipped 07/09/2026.** The server half of everything below is live. The contract the client
> codes against — with real transcripts — is [`epic_4_4_api.md`](./epic_4_4_api.md); this
> section is the reasoning behind it. Where the two differ, the API file is what the server
> does.
>
> Three things changed during implementation and are recorded in the API file:
> §1.5's draft prefix SQL 500s on a trailing negated phrase, so the prefix rule moved into an
> IMMUTABLE `vi_search_query()`; the instructor and category ILIKEs are wrapped in `unaccent()`
> on both sides rather than left raw; and the migration also registers the generated column in
> `typeorm_metadata`, without which `migration:generate` fails for the whole project.

### 1.1 `GET /api/v1/courses` — the one endpoint

Public, no auth today. Envelope and card shape as built; the changes below are additive.

```jsonc
{
  "data": [ /* CourseCardDto */ ],
  "totalCount": 42, "page": 1, "limit": 9, "hasNextPage": true
}
```

`limit` defaults to 12 server-side and is capped at 50. **The client sends `limit=9`
explicitly** (`services/catalog.ts:25`) and paginates on the same number — keep them in sync or
the page count and the result set disagree.

### 1.2 Query parameters — singular → plural

The only breaking change in this epic. Four params gain a plural form:

| Today | After | Semantics |
|---|---|---|
| `groupId` (uuid) | `groupIds` (uuid csv) | OR within the set |
| `categoryId` (uuid) | `categoryIds` (uuid csv) | OR within the set |
| `levelId` (uuid) | `levelIds` (uuid csv) | OR within the set |
| `instructorId` (uuid) | `instructorIds` (uuid csv) | OR within the set |

Everything else is unchanged: `search`, `isFree`, `minPrice`/`maxPrice`, `language`,
`minRating`, `minDurationSecs`/`maxDurationSecs`, `hasCertificate`, `page`, `limit`.

`sortBy` gains a sixth value, **`relevance`**, which is the implicit default whenever `search`
is present — see §1.5.

**Combination:** AND across dimensions, OR within one, empty = no filter. Always implicitly
`status = 'published' AND enrollmentOpen = true`.

**Correction to the draft:** it types `instructorIds` as *"number csv — user ids (integer)"*.
Since Epic 5 the instructor is its own entity with a **uuid** id, and the filter matches the
`course_instructor` join in any role (`course.repository.ts:139-148`). A user id would match
nothing.

**Migration:** accept the singular names as aliases for one release. The client, the header
route, and any bookmarked URL all use them today; a hard swap breaks live links for no gain.
Drop the aliases when nothing sends them.

### 1.3 `CourseCardDto` — three additions

```jsonc
{
  // unchanged
  "id", "slug", "title", "thumbnailUrl", "shortDescription",
  "primaryInstructor": { "id", "fullName", "slug", "profilePictureUrl" } | null,
  "coInstructorCount", "level": { "id", "name" } | null,
  "totalDurationSecs", "price", "isFree", "avgRating", "totalEnrollments",

  // added by this epic
  "language": "vi",
  "groupIds": ["uuid"],        // for pill highlighting without a second call
  "hasPreview": true           // EXISTS(lecture WHERE isPreview), one batched query
}
```

`avgRating` is `null` before the first rating — not `0`. The card must not render zero stars
for an unrated course.

### 1.4 The "Enrolled" badge — decision required

The draft's FE-12 wants an *Enrolled* overlay on the card. **The catalog cannot produce it
today:** the endpoint is fully public with no auth guard, so the server does not know who is
asking. Three options:

| Option | Cost | Trade |
|---|---|---|
| **A — optional auth** (`AuthGuard(['jwt','anonymous'])`, as the overview already does) plus `isEnrolled` on the card | small BE change | the response now varies by caller; the client must key its cache on identity |
| **B — client-side join** against `/students/me/courses`, already fetched elsewhere | no BE change | one extra request per session; the badge is wrong until it lands |
| **C — drop the badge in V1** | nothing | the student sees no difference between a course they own and one they do not |

**Recommend A.** It matches the overview's established pattern, it is the only one that stays
correct on a cold load, and the cache-keying discipline it requires is the same lesson
`epic_4_3_fe.md` FE-4 already documents. If A is chosen, `Vary: Authorization` must be set on
the response or a shared cache will serve one student's badges to another.

### 1.5 Full-text search — the header search contract

**Decided: the header search runs a real Postgres full-text search over the course corpus, and
the catalog field runs the same one.** One search implementation, two entry points — a header
that searched differently from the field on the results page would be its own bug.

#### Why the current query cannot stay

`course.repository.ts:100` is a single `ILIKE '%term%'` over the whole raw string. Three
failures, in the order they will be hit:

1. **Multi-word queries mostly miss.** "genomic sequencing" matches nothing unless those two
   words are adjacent, in that order. A course called "Sequencing the genome" is invisible to
   the query most likely to be typed for it.
2. **Diacritics are absolute.** `khoa hoc du lieu` matches nothing; the course is
   "Khoá học Dữ liệu". Vietnamese users type without diacritics constantly, and no amount of
   ILIKE fixes this — the strings genuinely differ.
3. **No ranking.** A term appearing once in paragraph nine of `fullDescription` sorts exactly
   like the same term in the title.

(2) is the one that matters most here and is the reason this is worth a migration.

#### The implementation

**A custom text-search configuration**, so the tsvector and the query normalize identically:

```sql
CREATE EXTENSION IF NOT EXISTS unaccent;

-- 'simple' rather than a language config on purpose: Postgres ships no
-- Vietnamese stemmer, and Vietnamese is not inflected, so there is nothing for
-- a stemmer to do. What is needed is tokenisation, lowercasing and unaccent.
CREATE TEXT SEARCH CONFIGURATION vi_unaccent (COPY = simple);
ALTER TEXT SEARCH CONFIGURATION vi_unaccent
  ALTER MAPPING FOR hword, hword_part, word WITH unaccent, simple;
```

The configuration wrapper is not decoration: `unaccent()` called directly is `STABLE`, not
`IMMUTABLE`, so it cannot appear in a generated column or an index expression. Inside a text
search configuration it can.

**A stored generated column plus a GIN index**, weighted so the title wins:

```sql
ALTER TABLE "course" ADD COLUMN "searchVector" tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('vi_unaccent', coalesce("title", '')),            'A') ||
    setweight(to_tsvector('vi_unaccent', coalesce("shortDescription", '')), 'B') ||
    setweight(to_tsvector('vi_unaccent', coalesce("fullDescription", '')),  'C')
  ) STORED;

CREATE INDEX "IDX_course_search_vector" ON "course" USING GIN ("searchVector");
```

Generated, so it can never drift from the row — there is no trigger to forget and no backfill
to run; existing rows are computed by the `ALTER`. At 251 courses the table rewrite is
instant.

**Query side**, `websearch_to_tsquery` with prefix matching on the final token:

```sql
WHERE "searchVector" @@ :query
ORDER BY ts_rank("searchVector", :query) DESC
```

`websearch_to_tsquery` is the right parser for user input: it accepts `"quoted phrases"`,
`or`, and `-excluded`, and — unlike `to_tsquery` — it **never throws on malformed input**. A
user typing `c++ (` must not produce a 500.

Prefix matching on the last token only (`term:*`) makes the catalog's as-you-type field
useful: `genom` finds `genomics` while the search is still being typed. Earlier tokens stay
exact, so results stop thrashing as the query grows.

#### What FTS does not cover, stated plainly

- **Instructor names and category names stay on the existing `ILIKE` EXISTS sub-queries**,
  OR-ed with the FTS predicate. A generated column cannot reach another table, and a
  trigger-maintained search table is not worth it at this size. Consequence: an instructor
  match is unranked and diacritic-sensitive. Revisit if instructor search turns out to be a
  common path.
- **Mid-word substrings stop matching.** ILIKE `%nomic%` found "genomic"; FTS will not, because
  it indexes tokens. Real queries start at word boundaries, so this is the right trade — but it
  is a behaviour change, not a pure upgrade, and it belongs in the release note.

#### `relevance` becomes a sort — and the default when searching

Add `relevance` to `CATALOG_SORTS`. **When `search` is present and the caller sent no explicit
`sortBy`, the default is `relevance`, not `newest`.** Otherwise `ts_rank` is computed and then
discarded by an ORDER BY on `publishedAt`, and every weight above is wasted. With no search
term, `relevance` degrades to `newest` — ranking a corpus against an empty query is meaningless.

This is the one place the change is visible beyond the result set: a user who searches now gets
best-match-first instead of newest-first, which is what a search box is expected to do.

### 1.6 Master data — no change

`GET /master-data/codes?groupKey=course_group | course_category | course_level`, whole-group,
localized by the Epic 6 chain, `Vary: X-Locale`. Already wired on both sides.

**Caveat:** the dev database currently holds **605** `course_level` codes and **304**
`course_category` codes, almost all test junk (Epic 4.2 §4.1). A multi-select checkbox list
rendered from that is unusable. **The master-data cleanup must run before this screen is
demoed** — it is the `npm run clean:master-data -- --apply` decision still open from 4.2.

---

## 2. Backend work

**~½ day.** Six of the draft's eight tasks are already done (§0).

### BE-1 — Plural filter params (P1)

**Files:** `src/course-catalog/dto/find-courses-catalog.dto.ts`,
`src/course-catalog/course-catalog.service.ts`,
`src/courses/infrastructure/persistence/relational/repositories/course.repository.ts`

Add `groupIds` / `categoryIds` / `levelIds` / `instructorIds` as uuid arrays, keeping the
singular names as aliases (§1.2). A CSV `@Transform` plus `@IsUUID('4', { each: true })` — the
global `ValidationPipe` runs `whitelist: true`, so a param the DTO does not declare is **dropped
silently with a 200**, which is exactly how a plural param would appear to "work" while
filtering nothing.

In the repository, the four singular equality checks become `IN (:...ids)`:

```ts
// categoryId → categoryIds
if (filterOptions?.categoryIds?.length) {
  query.andWhere('category.id IN (:...categoryIds)', { categoryIds: filterOptions.categoryIds });
}
// groupIds and instructorIds keep their EXISTS sub-query, with IN inside it
```

Empty array = no filter, never "match nothing".

### BE-2 — Card additions (P2)

`language` and `groupIds` come from the row and the assignment join the group filter already
uses. `hasPreview` needs one batched `EXISTS` per page — follow the instructor pattern at
`course-catalog.service.ts:50-55`, one query for the whole page, never per card.

### BE-3 — Full-text search (P1, ~½ day)

**Files:** a new migration, `course.entity.ts`, `course.repository.ts`,
`find-courses-catalog.dto.ts`, `course.repository.ts` (`CATALOG_SORTS`)

Implements §1.5. Four pieces:

1. **Migration** — `CREATE EXTENSION unaccent`, the `vi_unaccent` text search configuration,
   the generated `searchVector` column, the GIN index. `down()` drops all four in reverse; the
   configuration must be dropped last because the column depends on it.
2. **Entity** — declare `searchVector` as a read-only column
   (`@Column({ type: 'tsvector', select: false, insert: false, update: false })`) so TypeORM
   knows it exists and never tries to write it. A generated column that TypeORM believes it
   owns is an INSERT that fails at runtime and passes every unit test.
3. **Repository** — replace the title/description ILIKE block with
   `"searchVector" @@ :tsquery`, keeping the instructor `EXISTS` sub-query OR-ed alongside it.
   Build the tsquery with `websearch_to_tsquery('vi_unaccent', :term)`, appending `:*` to the
   final token for prefix matching.
4. **Sort** — add `relevance` to `CATALOG_SORTS`, order by
   `ts_rank("searchVector", :tsquery) DESC` with the existing `course.id` tiebreak, and make it
   the default when `search` is present and `sortBy` was not sent. Falls back to `newest` when
   there is no search term.

**Category name in the haystack.** The draft asks for it. It stays an `ILIKE` EXISTS like the
instructor join — same reason, another table. Worth knowing it is why a search for "biology"
can return a course whose title never says so; surprising unless the card explains the match.
Recommend including it and revisiting if it confuses.

### BE-4 — Tests (the actual work)

Table-driven, one case per filter alone, then: two dimensions AND-ed; two values in one
dimension OR-ed; `isFree=false` (the falsy trap — `undefined` and `false` must not collapse);
each sort's ordering; `limit` above the cap clamped to 50; page 2 does not repeat a row from
page 1 (the tiebreak); an empty plural param behaving as no filter; and a plural param with one
value matching the singular's result exactly.

Plus the full-text cases, which are the ones most likely to regress silently: a diacritic-free
query matching an accented title (`khoa hoc` → "Khoá học"); a two-word query matching a course
whose title has those words in the other order; a title match outranking a `fullDescription`
match for the same term; a prefix query (`genom`) matching `genomics`; `websearch_to_tsquery`
surviving hostile input (`c++ (`, a lone quote, 500 characters) with a 200 rather than a 500;
and `relevance` degrading to `newest` when no search term is sent.

### Not doing

| Draft item | Why |
|---|---|
| BE-5 hard cap 50 | already `CATALOG_MAX_LIMIT` |
| BE-6 master data localized | already wired |
| BE-8 pg_trgm index | Superseded. §1.5 ships a GIN index on a tsvector, which is the right index for this query and makes a trigram index redundant. pg_trgm would only be needed to bring back mid-word substring matching, which §1.5 gives up deliberately. |
| Faceted counts | correctly deferred in the draft; they need a second aggregate query per request |

---

## 3. Frontend work

**~2½ days.** This is where the epic lives.

### FE-1 — Multi-select filters (P1, ~1 day)

**Files:** `src/store/use-course-filter-store.ts`, `src/components/catalog/CatalogFilterSidebar.tsx`

`levelId | categoryId | groupId | instructorId: string | null` become `string[]`, with
`toggleX` actions replacing `setX`. `toCatalogFilters` emits CSV and omits empty arrays.
The sidebar's `Select` controls become checkbox lists.

`withPageReset` already covers page reset on every filter change — no change needed there, and
it is worth reading before rewriting it.

### FE-2 — Debounce the search (P1, ~2 hours)

`courses/page-content.tsx:39-46` recomputes `filters` from the whole store on every change and
hands it straight to `useCourseCatalogQuery`. There is no debounce in the codebase at all, so
every keystroke is a request. `placeholderData` keeps the grid from collapsing and the
`AbortSignal` cancels the in-flight one, which is why nobody noticed — the server still receives
all of them.

Debounce **only the `search` field**, 300ms. A checkbox click should stay instant: debouncing it
makes the UI feel broken for a change the user knows is discrete.

### FE-3 — URL sync (P1, ~4 hours)

`useSearchParams` on mount to hydrate the store; `router.replace` (never `push` — filter changes
must not fill the back stack) on change. Serialize only non-default values, so a clean catalog
URL stays clean and is shareable.

This is AC-10, and it is also what makes G4 work: the header can only route to
`/courses?search=x` if the catalog reads that param.

### FE-4 — Header search routes to the catalog (P1, ~1 hour)

`Header.tsx:55-58`:

```ts
const moveToCourses = () => {
  const target = document.querySelector("#free-courses");
  target?.scrollIntoView({ behavior: "smooth" });
};
```

Today the header's search field submits into a scroll on the landing page and **the typed term
is discarded** — it looks like search and is not.

Route to `/{locale}/courses?search={term}` instead, on Enter and on the Search button. The
catalog then runs the full-text search of §1.5: one search implementation, two entry points.

**Do not pass a `sortBy`.** Omitting it is what lets the server default to `relevance`, so a
header search lands on best-match-first. Sending `newest` here — including by copying the
store's default into the URL — silently throws the ranking away, and it will look like the
ranking is broken rather than like the client asked for something else. §1.5.

The same rule governs FE-3's serializer: `sortBy` belongs in the URL only when the user picked
it, never as a default written out on every navigation.

Depends on FE-3.

### FE-5 — Category pills (P2, ~3 hours)

Horizontal scrolling row above the grid, from `course_group` master data, bound to `groupIds`,
multi-toggle, active state reflected from the store so the URL restores it.

**Label them "Career Paths", not "Categories".** The sidebar has a *Category* filter from a
different master-data group; two controls both called Category, filtering different columns, is
the confusion the draft's own decision 7.2 was trying to prevent — and naming is the only thing
that actually prevents it.

### FE-6 — Card additions (P2, ~2 hours)

Preview badge from `hasPreview`; enrolled overlay per the §1.4 decision. Guard `avgRating: null`
so an unrated course shows no stars rather than zero.

### FE-6b — `relevance` in the sort dropdown (P2, ~30 min)

`CatalogSortDropdown` needs the sixth option, shown **only while a search term is present** —
"Most relevant" against an empty query is an option that does nothing. When the term is
cleared, a selected `relevance` falls back to `newest` on both sides.

### FE-7 — Duration presets (P3, ~30 min)

Three today (`short` ≤2h / `medium` 2-6h / `long` ≥6h), four in the draft (0-2 / 2-6 / 6-12 /
12h+). Splitting `long` is a one-line change to `durationPresets`. Worth checking against real
data first: with every lecture currently carrying a placeholder duration (Epic 4.2 BUG-09), a
12h+ bucket may be empty or meaningless until durations are real.

### Already built — do not rebuild

`<FilterSidebar/>`, `<CategoryFilter/>`, `<LevelFilter/>`, `<PriceFilter/>`, `<DurationFilter/>`,
`<RatingFilter/>`, `<SortDropdown/>`, `<ResultCount/>`, `<CourseCard/>`, `<CatalogSkeleton/>`,
`<CatalogEmpty/>`, `<PaginationBar/>`, the hero search field, and the store's page-reset
behaviour. The draft lists all of these as new work; they exist and are data-bound. **Modify,
do not recreate** — the components carry decisions in their comments that a rewrite would drop.

Mobile drawer (<768px) and i18n labels: check before building. The sidebar already renders
responsively and the labels already come from `catalog.json` in both locales.

---

## 4. Acceptance criteria

Only the ones that can fail today are listed; the draft's AC-1…AC-13 otherwise pass.

| # | Scenario | Pass condition |
|---|---|---|
| AC-1 | Two categories checked | OR within category, AND with other dimensions; both chips active |
| AC-2 | Type "genomic sequencing" | Matches a course titled "Sequencing the genome" (§1.5) |
| AC-2b | Type `khoa hoc du lieu`, no diacritics | Matches "Khoá học Dữ liệu" — the reason FTS earns its migration |
| AC-2c | Type `genom` | Matches "Genomics" while still typing (prefix on the final token) |
| AC-2d | Search a term that appears in one title and one long description | The title match sorts first |
| AC-2e | Header search, Enter | Lands on `/courses?search=…` with **no `sortBy`** in the URL, and results come back relevance-ordered |
| AC-2f | Search `c++ (` or a lone `"` | 200 with a result set, never a 500 |
| AC-2g | Clear the search box | Sort falls back to `newest`; the `relevance` option disappears |
| AC-3 | Type 8 characters | **One** request fires, not eight |
| AC-4 | Refresh a filtered URL | Every filter restored, including page |
| AC-5 | Header search "dna", Enter | Lands on `/courses?search=dna` with the grid filtered |
| AC-6 | Click two pills | Both active, `groupIds` carries both, URL reflects it |
| AC-7 | Clear All | Filters reset, page 1, URL back to `/courses` |
| AC-8 | Unrated course card | No stars, not zero stars |
| AC-9 | `limit=500` | Clamped to 50 |
| AC-10 | Page 2 | No row repeated from page 1 |
| AC-11 | Enrolled student sees the badge | Per the §1.4 decision; N/A if C |

---

## 5. Sequence

| Phase | Work | Size |
|---|---|---|
| 0 | Answer §6. `isEnrolled` (§1.4) changes the card contract, so it blocks BE-2. | — |
| 1 | BE-1, BE-2, BE-4 | ~½ day |
| 1b | BE-3 full-text search — migration, entity, query, `relevance` sort | ~½ day |
| 2 | FE-1 multi-select | ~1 day |
| 3 | FE-3 URL sync → FE-4 header routing | ~½ day |
| 4 | FE-2 debounce, FE-5 pills, FE-6 card, FE-7 presets | ~½ day |
| 5 | AC walk | ~½ day |

**~3½ days.** BE-1 before FE-1 — the client cannot send plural params to a server that drops
them silently. BE-3 before FE-4 and FE-6b, so the header lands on a catalog that actually ranks.

**Blocker outside this epic:** the master-data cleanup (§1.6). Multi-select checkbox lists
against 605 levels and 304 categories are not demoable, and no amount of frontend work fixes
that.

---

## 6. Open questions — answered 07/09/2026

1. ~~**`isEnrolled` on the card**~~ — **decided: A, optional auth.** `GET /courses` now runs
   `AuthGuard(['jwt','anonymous'])` and sets `Vary: Authorization`. The client must key its
   query cache on user identity.
2. ~~Token search~~ — **decided: full-text search** (§1.5).
3. ~~**Category name in the search haystack**~~ — **decided: yes.** Both it and the instructor
   name stay `EXISTS` sub-queries, but wrapped in `unaccent()` on both sides so `sinh hoc`
   finds "Sinh học". Unranked; the caveat in BE-3 stands.
4. **Duration presets** — still open, and still **recommend waiting** for real lecture
   durations (Epic 4.2 BUG-09). Client-side only, so it does not block anything here.
5. ~~**Singular param aliases**~~ — **decided: keep for one release.** Marked `deprecated` in
   Swagger and unioned into the plural form when both are sent.

*End of Epic 4.4.*
