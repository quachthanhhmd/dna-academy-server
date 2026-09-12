# Epic 4.4 — API Integration Contract (Course Search & Catalog)

> **The handshake.** The client codes against this file and assumes nothing else. Rules and
> rationale live in [`epic_4_4_catalog.md`](./epic_4_4_catalog.md); this is what the server
> actually does today.
>
> **Status: the server half shipped on 07/09/2026.** BE-1 (plural filters), BE-2 (card
> additions), BE-3 (Vietnamese full-text search) and the §1.4-option-A optional auth are live,
> covered by 891 unit tests and a 43-case e2e suite that runs against a real Postgres
> (`test/user/course-catalog-search.e2e-spec.ts`). Every transcript in §8 was captured from a
> running stack, not written by hand.
>
> **The client half has not started.** FE-1…FE-7 in the epic still apply. Until they land the
> new fields are correct and unread — which is safe, because every change here is additive
> except the sort default in §4.

---

## 1. The one endpoint

| | |
|---|---|
| **URL** | `GET /api/v1/courses` |
| **Auth** | **Optional** — `AuthGuard(['jwt','anonymous'])`. Anonymous callers get the full catalog. |
| **Response headers** | `Vary: X-Locale, Accept-Language, Authorization` |

Sending a token is optional and changes exactly one field (`isEnrolled`, §3). Everything else
is identical for a guest and a signed-in student.

**Two client rules follow from that, and they are not optional:**

1. **Send the token whenever you have one.** Otherwise the enrolled badge never appears for a
   logged-in user and it will look like a server bug.
2. **Key the query cache on identity.** The same URL now returns different bodies for
   different callers. React Query: put the user id (or `"anon"`) in the query key. This is the
   same lesson `epic_4_3_fe.md` FE-4 already documents for the overview endpoint.

---

## 2. Query parameters

### 2.1 The four filters that went plural — **the only breaking change**

| New | Old (still works) | Type |
|---|---|---|
| `groupIds` | `groupId` | uuid CSV, or repeat the param |
| `categoryIds` | `categoryId` | uuid CSV, or repeat the param |
| `levelIds` | `levelId` | uuid CSV, or repeat the param |
| `instructorIds` | `instructorId` | uuid CSV — **instructor** ids, not user ids |

Both forms are accepted:

```
?groupIds=<uuid>,<uuid>          # CSV
?groupIds=<uuid>&groupIds=<uuid> # repeated
```

- **OR within one dimension, AND across dimensions.** Two `groupIds` mean "in either group";
  a `groupIds` plus a `levelIds` means "in one of those groups **and** at one of those levels".
- **Empty means no filter, never "match nothing".** `?groupIds=` and omitting it are the same
  request.
- **A malformed uuid is a 422, not a silent drop** — see §8.6. This is deliberate: the global
  `ValidationPipe` runs `whitelist: true`, so a param the server does not know is stripped and
  answered `200`, which is indistinguishable from a filter that matched everything.
- The singular names are **deprecated but live for one release** — bookmarked and shared URLs
  use them. Sent together with the plural form, the values are unioned. They are marked
  `deprecated` in Swagger; please migrate and tell us when nothing sends them.

### 2.2 Unchanged

`search`, `isFree`, `minPrice`, `maxPrice`, `language`, `minRating`, `minDurationSecs`,
`maxDurationSecs`, `hasCertificate`, `page`, `limit`.

`limit` defaults to **12** and is **clamped to 50**, not rejected — `limit=500` answers 200
with `"limit": 50`. The client currently sends `limit=9`; keep the request and the paginator on
the same number or the page count and the result set disagree.

### 2.3 `sortBy`

`newest` · `most_popular` · `highest_rated` · `shortest` · `longest` · **`relevance`** (new)

See §4 — the default is not constant, and getting this wrong is the most likely way to make
the new search look broken.

---

## 3. `CourseCardDto` — three additions plus `isEnrolled`

```jsonc
{
  // unchanged
  "id": "uuid",
  "slug": "khoa-hoc-du-lieu",
  "title": "Khoá học Dữ liệu",
  "thumbnailUrl": "https://…" ,           // nullable
  "shortDescription": "Nhập môn…",        // nullable
  "primaryInstructor": {                   // nullable
    "id": "uuid", "slug": "nguyen-van-an",
    "fullName": "Nguyễn Văn An", "headline": "Giảng viên",
    "profilePictureUrl": null
  },
  "coInstructorCount": 0,
  "level": { "id": "uuid", "name": "Cơ bản" },   // nullable
  "totalDurationSecs": 600,
  "price": 0,
  "isFree": true,
  "avgRating": null,                       // null before the first rating — NOT 0
  "totalEnrollments": 0,

  // added by Epic 4.4
  "language": "vi",
  "groupIds": ["uuid"],                    // [] when the course is in no group
  "hasPreview": true,
  "isEnrolled": false
}
```

| Field | Meaning | Client note |
|---|---|---|
| `language` | The course's language code. | |
| `groupIds` | `course_group` master-data ids assigned to the course. | Lets the category pills show their active state with **no second call**. Always an array. |
| `hasPreview` | At least one lecture has `isPreview: true`. | The "free preview" badge. |
| `isEnrolled` | Whether **the calling student** holds a live (non-cancelled) enrollment. | **Always `false` for an anonymous caller** — the endpoint is public and genuinely does not know. Do not render "not enrolled" from this while logged out; render nothing. |

**`avgRating` is `null`, not `0`, before the first rating.** An unrated course must render no
stars rather than zero stars (AC-8). This was already true; it is repeated because the card
currently gets it wrong.

The envelope is unchanged:

```jsonc
{ "data": [ /* CourseCardDto */ ], "totalCount": 42, "page": 1, "limit": 9, "hasNextPage": true }
```

---

## 4. Search behaviour — what the field actually does now

The catalog runs a real Postgres full-text search over the course corpus. The header search
must route to `/{locale}/courses?search=…` so both entry points hit the same implementation.

### 4.1 What it matches

| Typed | Finds | Why |
|---|---|---|
| `khoa hoc du lieu` | "Khoá học Dữ liệu" | Diacritics are folded on both sides. **This is the reason the epic exists.** |
| `Dữ liệu` | "Khoá học Dữ liệu" | Typing *with* diacritics still works. |
| `genomic sequencing` | "Sequencing the genome" | Tokens, not substrings — word order does not matter. |
| `genom` | "Genomics", "…the genome" | Prefix match, **final token only** (see the trap below). |
| `nguyen van an` | courses taught by "Nguyễn Văn An" | Instructor name/headline, diacritic-folded. |
| `sinh hoc` | courses in category "Sinh học" | Category name, diacritic-folded. |

Also supported, straight from the user's input: `"quoted phrases"`, `or`, and `-excluded`.

### 4.2 Two traps worth knowing before you file a bug

**The prefix is on the last token only.** `genom sequencing` does **not** match — `genom` is
matched exactly and only `sequencing` is treated as a prefix. This is deliberate: prefixing
every token makes results thrash as the user types. It also means an as-you-type field behaves
correctly, and a query with a trailing space behaves like the completed word.

**Mid-word substrings no longer match.** The old `ILIKE '%term%'` found "genomic" for the input
`nomic`; a tokenised index does not, because it indexes words. Real queries start at word
boundaries, so this is the right trade — but it is a **behaviour change, not a pure upgrade**,
and it belongs in the release note.

### 4.3 Ranking — the default is not constant

- **`search` present and no `sortBy` sent ⇒ the server sorts by `relevance`.**
- **`search` absent (or blank) ⇒ the server sorts by `newest`.**
- **`sortBy=relevance` with no `search` ⇒ degrades to `newest`.** Safe to send; it just does
  the sensible thing.
- An explicit `sortBy` always wins, even while searching.

Title matches outrank short-description matches, which outrank full-description matches
(weights A/B/C).

> ### ⚠️ Do not send a default `sortBy`
>
> This is the single most likely integration mistake in this epic.
>
> The header search must navigate to `/courses?search=dna` — **with no `sortBy` in the URL**.
> Writing the store's default (`newest`) into every URL silently throws the ranking away, and
> the symptom is "the new search returns results in a useless order", which reads as a server
> bug and is not one.
>
> The same rule governs the URL-sync serializer (FE-3): `sortBy` belongs in the URL **only when
> the user picked it**.
>
> Corollary for the sort dropdown (FE-6b): show "Most relevant" only while a search term is
> present, and fall back to `newest` on both sides when the term is cleared.

### 4.4 Hostile input never 500s

`c++ (`, a lone `"`, `-"khoa hoc"`, `& | !`, 500 characters, emoji — all answer `200` with a
result set (usually empty). Verified in §8.5 and pinned by 13 e2e cases. If you ever see a 500
from this endpoint with a weird search term, that is a real bug — please report it with the
exact string.

---

## 5. Master data — unchanged

`GET /api/v1/master-data/codes?groupKey=course_group | course_category | course_level`,
whole group, localized, `Vary: X-Locale`. Already wired on both sides.

> **Blocker outside this epic.** The dev database still holds hundreds of junk `course_level`
> and `course_category` codes from the pre-4.2 test runs. A multi-select checkbox list rendered
> from that is unusable, and no frontend work fixes it — the master-data cleanup
> (`npm run clean:master-data -- --apply`) has to run before this screen is demoed.

---

## 6. Integration checklist

- [ ] Send `groupIds` / `categoryIds` / `levelIds` / `instructorIds`; stop sending the singular forms.
- [ ] Treat an empty selection as **omit the param**, not `?groupIds=`.
- [ ] Send the JWT whenever the user has one, and **key the query cache on user identity**.
- [ ] Render `isEnrolled` only when logged in; ignore it while anonymous.
- [ ] Render no stars when `avgRating === null`.
- [ ] Bind the pills to `groupIds` off the card — no second request.
- [ ] **Never send a default `sortBy`.** Only when the user picked one.
- [ ] Show `relevance` in the sort dropdown only while a search term is present.
- [ ] Debounce **only** the `search` field, 300ms. Checkbox clicks stay instant.
- [ ] Keep `limit` and the paginator's page size on the same number.
- [ ] Expect `422` for a malformed uuid — surface it, do not swallow it.

---

## 7. Not in this release

| Asked for | Status |
|---|---|
| Faceted counts ("Beginner (12)") | Deferred — needs a second aggregate query per request. |
| Ranked instructor / category matches | Those two live in other tables and cannot be in the generated column. They match, diacritic-folded, but do not contribute to ranking. Revisit if instructor search turns out to be a common path. |
| Mid-word substring matching | Deliberately given up — §4.2. |
| Duration preset split (6–12h / 12h+) | Client-side only, and waiting on real lecture durations (Epic 4.2 BUG-09). |

---

## 8. Verification transcripts — 07/09/2026

Captured from a running stack against a course titled `Khoá học Dữ liệu 1788794078`, taught by
`Nguyễn Văn An 1788794078`, in category `Sinh học 1788794078`.

### 8.1 Diacritic-free search finds the accented title

```console
$ curl -sG "$API/courses" --data-urlencode "search=khoa hoc du lieu 1788794078"
{
  "data": [{
    "id": "5a9aa744-…", "slug": "khoa-hoc-du-lieu-1788794078",
    "title": "Khoá học Dữ liệu 1788794078",
    "primaryInstructor": { "fullName": "Nguyễn Văn An 1788794078", … },
    "level": { "name": "Cơ bản 1788794078" },
    "avgRating": null,
    "language": "vi",
    "groupIds": ["5c3facfa-5d1e-438f-8b83-20efa3fdb65c"],
    "hasPreview": true,
    "isEnrolled": false
  }],
  "totalCount": 1, "page": 1, "limit": 12, "hasNextPage": false
}
```

### 8.2 The response varies by caller, and says so

```console
$ curl -sD- -o /dev/null -G "$API/courses" --data-urlencode "search=Dữ liệu 1788794078"
HTTP/1.1 200 OK
Vary: X-Locale, Accept-Language, Authorization
```

### 8.3 Instructor name, typed without diacritics

```console
$ curl -sG "$API/courses" --data-urlencode "search=nguyen van an 1788794078"
1 ['Khoá học Dữ liệu 1788794078']
```

### 8.4 Category name in the haystack

```console
$ curl -sG "$API/courses" --data-urlencode "search=sinh hoc 1788794078"
1 ['Khoá học Dữ liệu 1788794078']
```

This is why a search can return a course whose title never mentions the term.

### 8.5 Hostile input

```console
  c++ (          -> 200
  "              -> 200
  -"khoa hoc"    -> 200
  & | !          -> 200
```

### 8.6 A malformed uuid is rejected, not ignored

```console
$ curl -sG "$API/courses" --data-urlencode "groupIds=not-a-uuid"
{ "status": 422, "errors": { "groupIds": "each value in groupIds must be a UUID" } }
```

### 8.7 The GIN index answers the search

```console
=# SET enable_seqscan=off;
=# EXPLAIN SELECT id FROM course WHERE "searchVector" @@ vi_search_query('khoa hoc');
 Bitmap Heap Scan on course
   Recheck Cond: ("searchVector" @@ '''khoa'' & ''hoc'':*'::tsquery)
   ->  Bitmap Index Scan on "IDX_course_search_vector"
         Index Cond: ("searchVector" @@ '''khoa'' & ''hoc'':*'::tsquery)
```

`vi_search_query` is IMMUTABLE, so Postgres folds it at plan time and the index is used rather
than the term being re-parsed per row.

### What pins this

| Claim | Test |
|---|---|
| Diacritics, word order, prefix, ranking, hostile input | `test/user/course-catalog-search.e2e-spec.ts` (43 cases, real Postgres) |
| Plural/singular params, empty = no filter, 422 on bad uuid | same file + `src/course-catalog/dto/find-courses-catalog.dto.spec.ts` |
| The `relevance` default and its degradation | `src/courses/infrastructure/persistence/catalog-sort.spec.ts` |
| Card additions batched one query per page | `src/course-catalog/course-catalog.service.spec.ts` |
| `isEnrolled` never leaks between callers | `test/user/course-catalog-search.e2e-spec.ts` §isEnrolled |
