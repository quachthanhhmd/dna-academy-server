# EPIC 07 — Admin Overview Dashboard

> **Implementation plan.** Source requirements: `DNA Website requirements - Sheet1.pdf`
> (Dashboard Visualization / course enrollment dashboard / student reflection dashboard).
> Layout and chart choices are unchanged from the design spec — §3 and §4 of the original draft
> stand as written and are not restated here. This file replaces the draft's §2, §6 and §7:
> the data definitions, the API and the work breakdown.
>
> **Verified against the code on 13/09/2026**, branch `refactor/snake-case-column-names`
> (`36a4811`). Every table, column and identifier below is literal.
>
> **For stakeholders:** the plain-language version of every formula is
> `docs/EPIC-07-dashboard-metrics.html`. Keep the two in sync — that file is what the numbers
> get explained with when someone asks why a percentage looks wrong.
>
> **Effort: ~13 days** (BE 7, FE 6). The draft said 10–11 and did not cost the PDF renderer.

---

## 0. Locked decisions

| # | Decision | Locked |
|---|---|---|
| **D1** | Who is a "student" | Users whose **`user_role`** is **User**. A role **`instructor` (id 4)** keeps teaching accounts out of the count — see BE-0. **Amended 17/09:** roles are read from `user_role`, not `user.role_id` — [`epic_1_permission_model.md`](./epic_1_permission_model.md) §2.5. |
| **D2** | Completion rate | **Cohort-based.** Denominator = enrollments *created* in the period; numerator = how many of *those* completed. Not "completions this month ÷ enrolments this month", which can exceed 100%. |
| **D3** | "Completed" bucket & KPI | Keyed on **`enrollment.status = 'completed'`**, never on `progress_pct = 100`. Status is what issues the certificate, and Epic 4.2 D7 made it sticky. |
| **D4** | Average rating | **Includes unmoderated ratings.** `course_rating` is averaged with no `review_status` filter, which matches what `course.avg_rating` already stores — so the dashboard and the catalog can never disagree. |
| **D5** | Export | **CSV and server-rendered PDF.** The PDF is real work with a real dependency — BE-7. |
| **D6** | Timezone | **`Asia/Ho_Chi_Minh`.** A "day" is 00:00–23:59 Vietnam time, every bucket boundary and every period edge. Columns are `timestamptz` since migration `1787200000000`, so one `AT TIME ZONE` does it. |
| **D7** | Permission | **`dashboard:view`** and **`dashboard:export`** — not `analytics:*`, which does not exist (BE-9). **Amended 17/09:** `/students` and `/reflection/comments` move to **`dashboard:view_students`**, and every aggregate is scoped to the caller's primary courses unless they hold `courses:edit_any` — [`epic_1_permission_model.md`](./epic_1_permission_model.md) §1.9, §2.7. |
| **D8** | "Active students" | Distinct students whose `enrollment.last_accessed_at` falls in the period. Not "enrolled in the period", which measures acquisition and calls a daily learner inactive. |

### Carried from the review, unchanged

- Table names are **singular** (`enrollment`, `user`, `course`, `course_rating`,
  `career_reflection_answer`, `career_reflection_question`). Column names are snake_case as of
  `36a4811`.
- Two indexes the draft assumed exist do not — BE-8.
- `CareerReflectionAnswerEntity.question` and `.enrollment` are both `eager: true`; every
  aggregate must use `createQueryBuilder`, never `find()` — BE-4.
- Master-data cleanup is a prerequisite for the Course Group filter — §6.

---

## 1. API integration

### 1.1 Shared contract

All routes are `@UseGuards(AuthGuard('jwt'), PermissionGuard)` with
`@RequirePermission('dashboard', 'view')`; the export route uses `'export'`.

**Base path:** `/api/v1/admin/dashboard`

**Shared query params**, identical on every endpoint:

| Param | Type | Notes |
|---|---|---|
| `period` | `7d \| 30d \| 90d \| quarter \| year \| custom` | default `30d` |
| `from`, `to` | `YYYY-MM-DD` | required when `period=custom`; **Vietnam calendar dates**, inclusive of both ends |
| `courseId` | uuid | single course |
| `groupId` | uuid | `course_group_assignment.group_id`; aggregates every course in the group |
| `page`, `limit` | int | list endpoints only; `limit` cap 100 |

`courseId` and `groupId` are ANDed when both are sent. Neither is required.

**Envelope**, every endpoint:

```jsonc
{
  "data": { /* endpoint-specific */ },
  "meta": {
    "period":   { "from": "2026-08-15T00:00:00+07:00", "to": "2026-09-13T23:59:59+07:00" },
    "courseId": null,
    "groupId":  null,
    "timezone": "Asia/Ho_Chi_Minh",
    "generatedAt": "2026-09-13T09:12:03+07:00"
  }
}
```

`meta.period` echoes the **resolved** window with its offset, so the client never re-derives it
and a screenshot of the dashboard can always be tied to an exact range.

### 1.2 Endpoints

| Method | Path | Returns |
|---|---|---|
| `GET` | `/kpis` | 7 KPI values + previous-period delta + sparkline series |
| `GET` | `/enrollments-over-time` | buckets, stacked by `enrollment_source` |
| `GET` | `/progress-distribution` | 6 buckets + counts |
| `GET` | `/top-courses` | top 10 by enrollments, with completion rate and avg progress |
| `GET` | `/enrollment-status` | counts per status |
| `GET` | `/reflection` | per-category averages, response rate, total responses |
| `GET` | `/reflection/comments` | free-text list, paginated |
| `GET` | `/students` | student-level drill-down, paginated |
| `GET` | `/export` | `format=csv \| pdf`, `dataset=<endpoint key>` |

The draft's `/rating` endpoint is **dropped**: average rating is one KPI and its trend is one
sparkline, both already in `/kpis`. A ninth endpoint for one number is a ninth thing to keep
consistent.

### 1.3 Empty data

`data` is always the correct shape with empty arrays and `null` scalars — never a zero-filled
series. The PDF requirement is "No data available", and a `0` is a measurement, not an absence.

```jsonc
{ "data": { "buckets": [], "total": 0 }, "meta": { … } }
```

The client renders its empty panel on `buckets.length === 0`, not on `total === 0`.

### 1.4 Drill-down carries personal data

`/students` returns names, emails and progress per person. It is gated server-side by the same
`dashboard:view` permission as everything else — **hiding the UI is not the control**. Response
is paginated, capped at 100, and never returns password hashes, tokens or `social_id`.

---

## 2. Backend work

### BE-0 — The `instructor` role (D1) — ~0.5d

Three pieces, in order.

**1. Enum and seed.** `src/roles/roles.enum.ts`:

```ts
export enum RoleEnum {
  'admin' = 1,
  'user' = 2,
  'superAdmin' = 3,
  'instructor' = 4,
}
```

Add the matching block to `RoleSeedService.run()`, following the `superAdmin` pattern exactly
(count-then-insert, so re-running the seed is safe).

**2. Backfill migration.** Every teaching account currently holds role `user`, so without this
the student count stays inflated and D1 changes nothing:

```sql
UPDATE "user" u
   SET "role_id" = 4
  FROM "instructor" i
 WHERE i."user_id" = u."id"
   AND u."role_id" = 2;
```

`instructor.user_id` is a nullable `OneToOne` — an instructor profile with no login account is
normal and is skipped by the join. Do **not** touch a user already on role 1 or 3: an admin who
also teaches keeps the stronger role.

**3. Grant nothing.** Do not seed any `role_permission` row for role 4. An instructor account
must not gain admin-panel access as a side effect of this epic; give it permissions when there
is a feature that needs them.

> **Note for the definition — superseded 17/09.** `user.role_id` was chosen here because it was
> the column every account was guaranteed to have. The permission model makes `user_role` the only
> source of truth and backfills a row for every user, so the KPI now counts `user_role`
> ([`epic_1_permission_model.md`](./epic_1_permission_model.md) §2.5). There is also a `student_profile` table (one row per onboarded
> user) — a stricter definition if "registered" should mean "finished onboarding". Flagged, not
> chosen; D1 stands.

### BE-1 — The metrics module, and the timezone trap — ~1d

Create `src/admin-dashboard/` with a `MetricsQueryService` holding the shared SQL fragments.
Every endpoint composes from it. One definition per metric, in one file — the alternative is
nine endpoints that each compute "completion rate" slightly differently.

**Timezone.** Every timestamp column is `timestamptz` as of migration
`1787200000000-AlterTimestampsToTimestamptz`, so a stored value is an absolute instant and one
conversion is enough:

```sql
date_trunc('day', e."enrollment_date" AT TIME ZONE 'Asia/Ho_Chi_Minh')
```

Name the zone explicitly every time. Postgres would otherwise convert using the session's
`TimeZone`, which is UTC — plausible-looking buckets, cut at 07:00 Vietnam time. The API
container runs `TZ=Asia/Ho_Chi_Minh`, but that governs how *Node* formats a date and has no
effect on what Postgres groups by.

> Before that migration the columns were `timestamp without time zone` and this needed a double
> `AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Ho_Chi_Minh'`. Any SQL written against the old schema
> and carried over will now be wrong by seven hours in the other direction.

**Period resolution.** `from`/`to` arrive as Vietnam calendar dates and are resolved to UTC
instants before any query runs:

```
from 2026-09-13  →  2026-09-12T17:00:00Z   (00:00:00 +07)
to   2026-09-13  →  2026-09-13T16:59:59Z   (23:59:59 +07)
```

Half-open internally (`>= from AND < to + 1 day`) so a row at exactly 23:59:59.999 is not lost.

**Bucket granularity** by period: `7d`/`30d` → day, `90d`/`quarter` → week (ISO, Monday),
`year` → month. `custom` picks by span: ≤ 31 days → day, ≤ 180 → week, else month.

### BE-2 — `/kpis` — ~1.5d

Seven metrics, each with a previous-period delta (same length, immediately before) and a
sparkline over the current period's buckets.

| KPI | Definition |
|---|---|
| Registered students | `COUNT(user_role) WHERE role_id = 2` — **not period-filtered**; it is a running total. The delta compares users created in this period vs the previous one. Read `user_role`, not `user.role_id` (permission model §2.5). |
| Active students | `COUNT(DISTINCT enrollment.student_id) WHERE last_accessed_at IN period` (D8) |
| Enrollments | `COUNT(enrollment) WHERE enrollment_date IN period AND status <> 'cancelled'` |
| Completed courses | `COUNT(enrollment) WHERE status = 'completed' AND completed_at IN period` (D3) |
| Completion rate | **Cohort** (D2) — see below |
| Avg course progress | `AVG(enrollment.progress_pct)` over non-cancelled enrollments in the period |
| Avg course rating | `AVG(course_rating.rating)` over ratings submitted in the period, **no `review_status` filter** (D4) |

**Completion rate, in full:**

```sql
WITH cohort AS (
  SELECT e."status"
    FROM "enrollment" e
   WHERE e."enrollment_date" >= :from AND e."enrollment_date" < :to
     AND e."status" <> 'cancelled'
)
SELECT COUNT(*) FILTER (WHERE "status" = 'completed')::float
       / NULLIF(COUNT(*), 0) * 100 AS completion_rate
  FROM cohort;
```

`NULLIF` returns `NULL` on an empty cohort, which the DTO passes through as `null` and the
client renders as "No data" — never `0%`, which would read as "nobody finished".

**The honest caveat, and it belongs in the UI:** a cohort from the last 7 days has had 7 days to
finish a course that takes 6 weeks, so its rate is near zero by construction. The card shows the
cohort window in its subtitle ("of students who enrolled 15/08 – 13/09") so the number is never
read as a quality score. This is the single most misreadable figure on the page.

Sparklines are seven extra time series in one request. Compute them in **one** grouped query per
metric, not one per bucket.

### BE-3 — Charts — ~1.5d

**`/enrollments-over-time`** — `GROUP BY bucket, enrollment_source`. `enrollment_source` is
**nullable**, so rows predating the column group under a fourth series `unknown`; do not
`COALESCE` it into `organic`, which would invent data.

**`/progress-distribution`** — six buckets, evaluated in this order so they cannot overlap:

```
completed    status = 'completed'                      (D3 — status, not 100%)
not_started  status <> 'completed' AND progress_pct = 0
1–25         status <> 'completed' AND progress_pct >  0  AND <= 25
26–50        …                          >  25 AND <= 50
51–75        …                          >  50 AND <= 75
76–99        …                          >  75 AND <  100
```

A row at `progress_pct = 100` whose status is not yet `completed` lands in **76–99**. That is
deliberate: it is a real state (last lecture finished, detector not yet run) and it must not be
counted as completed, or the bucket total stops matching the completed KPI.

**`/top-courses`** — top 10 by enrollment count, each with cohort completion rate and average
progress. One query, `GROUP BY course.id`, `ORDER BY count DESC LIMIT 10`.

**`/enrollment-status`** — `GROUP BY status`, all four values, `cancelled` included.

### BE-4 — Reflection — ~1d

**Use `createQueryBuilder` with explicit selects.** `CareerReflectionAnswerEntity.question` and
`.enrollment` are both `eager: true`, so any `find()` hydrates two joined objects per answer
row. On an aggregate over thousands of answers that is the difference between one query and a
memory problem.

**Per-category averages** — `AVG(rating_answer) GROUP BY question.category` over the six
values: `interest`, `understanding`, `confidence`, `skill_fit`, `advanced_intention`,
`overall_usefulness`.

A category with no answers returns **`null`, not `0`**. The client must render that axis as
absent — a radar axis at zero reads as "confidence: none", which is a claim the data does not
make. If that turns out to be unworkable in the radar, switch the chart to a bar per category;
the rule is the requirement, the chart is not.

**Response rate:**

```
enrollments with >= 1 career reflection answer  ÷  enrollments with status = 'completed'
```

Denominator is completed enrollments because the form is only offered after completion. Return
`null` when the denominator is 0.

**`/reflection/comments`** — `text_answer IS NOT NULL AND text_answer <> ''`, joined to the
enrollment's course for the title, ordered by `submitted_at DESC`, paginated.

### BE-5 — `/students` drill-down — ~0.5d

One endpoint serving every drill-down. Beyond the shared params:

| Param | Values |
|---|---|
| `metric` | `completed \| active \| enrolled \| progress_bucket` |
| `bucket` | required when `metric=progress_bucket`; one of the six keys |

Returns `{ studentId, fullName, email, courseTitle, enrollmentDate, progressPct, status, completedAt }`,
paginated. See §1.4 — this is the personal-data surface.

### BE-6 — CSV export — ~0.5d

`GET /export?format=csv&dataset=<key>` under `dashboard:export`. Streams the same rows the
matching endpoint returns, unpaginated, with the resolved filters in the filename
(`dashboard-enrollments-20260815-20260913.csv`).

**UTF-8 BOM required.** Excel on Windows reads a BOM-less UTF-8 CSV as Windows-1252 and turns
every Vietnamese name into mojibake. One three-byte prefix; without it the export is unusable
for the audience most likely to open it.

### BE-7 — PDF export (D5) — ~1.5d

There is **no PDF renderer in this project today** and no library in `package.json`. This is a
new dependency and a Docker change, which is why it is its own task rather than half of BE-6.

**Approach: headless Chromium via Puppeteer**, rendering a server-side HTML template of the
current view. The alternatives (PDFKit, pdfmake) require redrawing every chart by hand in a
drawing API; the charts already exist as HTML/SVG.

**Dockerfile** — the image is `node:24.14.1-alpine`, which has no Chromium:

```dockerfile
RUN apk add --no-cache chromium nss freetype harfbuzz ca-certificates font-noto
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
```

**Vietnamese fonts are the trap.** A default Alpine image renders every diacritic as a box.
`font-noto` covers Vietnamese; verify with a name carrying stacked marks — `Nguyễn Thị Hường`
— before calling this done. The same failure hits any font choice that was picked without
looking at Vietnamese text.

**Run it out of the request path.** A Chromium render is seconds, not milliseconds. Either cap
it with a hard timeout and a clear 504, or return a job id the client polls. Do not let one
export hold a request thread for ten seconds.

> **Worth knowing:** once this exists, the certificate PDF that Epic 4.1 D4 deferred
> (`fileUrl` is still hardcoded `null`, and the student's Download button calls
> `window.print()`) becomes a template away. Not in this epic's scope — but this is the
> decision that unblocks it, and it is worth telling whoever owns Epic 4.1.

### BE-8 — Index migration — ~0.5d

Neither of these exists; the draft assumed both did.

```sql
CREATE INDEX "IDX_enrollment_enrollment_date"   ON "enrollment" ("enrollment_date");
CREATE INDEX "IDX_enrollment_completed_at"      ON "enrollment" ("completed_at")
  WHERE "completed_at" IS NOT NULL;
CREATE INDEX "IDX_enrollment_last_accessed_at"  ON "enrollment" ("last_accessed_at")
  WHERE "last_accessed_at" IS NOT NULL;
CREATE INDEX "IDX_cra_enrollment"               ON "career_reflection_answer" ("enrollment_id");
CREATE INDEX "IDX_cra_question"                 ON "career_reflection_answer" ("question_id");
```

Postgres does not index a foreign-key column automatically — it indexes the *referenced* key.
Both `career_reflection_answer` FKs are unindexed today.

`IDX_enrollment_student_status` and `IDX_lecture_progress_enrollment_status` already exist; do
not duplicate them.

### BE-9 — Permissions and tests — ~1d

`@RequirePermission('dashboard', 'view')` / `('dashboard', 'export')`. The module is already in
`ADMIN_MODULES` and already seeded; **no new permission rows are needed**, which is the whole
reason to use it instead of `analytics`.

Tests that must exist by name:

- A user without `dashboard:view` gets 403 on every endpoint, including `/students`.
- **Timezone**: an enrollment at `2026-09-12T17:30:00Z` falls in the Vietnam day
  `2026-09-13`, not `2026-09-12`. Catches both a missing `AT TIME ZONE` and a leftover double
  one from before the `timestamptz` migration.
- **Cohort completion rate**: a period containing 10 enrollments of which 3 completed returns
  30 — and completions belonging to an *earlier* cohort do not raise it.
- Empty cohort → `null`, not `0`.
- Progress buckets are mutually exclusive and sum to the total; `progress_pct = 100` with
  status `in_progress` lands in 76–99.
- `enrollment_source IS NULL` appears as `unknown`, not `organic`.
- A reflection category with no answers returns `null`.
- `courseId` and `groupId` together narrow rather than widen.
- Reflection aggregates issue one query — assert the query builder is used, since `find()` here
  is silently correct and quietly expensive.

---

## 3. Frontend work

Repo: `dna-academy-client`. Layout, chart types and responsive rules follow the design spec's
§3/§4 unchanged.

### FE-1 — Shell and global filters — ~1d

Route under `admin-panel/`, gated on `dashboard:view` from the session's permissions.

Filter bar: period, course single-select, course group select, export. **All four live in the
URL** (`?period=30d&courseId=…`), so browser back restores the previous view and a filtered
dashboard can be pasted into a message. Follow `use-course-filter-store.ts` — it already solves
page-reset-on-filter-change and is the existing precedent.

One filter change refetches every zone. Zones are independent queries: a failure in one renders
that zone's error state and leaves the rest of the page standing.

### FE-2 — KPI row — ~1d

Seven cards: value, delta vs previous period, sparkline.

- **Completion rate carries its cohort window as a subtitle** — "of students who enrolled
  15/08 – 13/09". Per BE-2, this number is the easiest on the page to misread, and the subtitle
  is the fix.
- A `null` value renders "No data", never `0`.
- Card click opens the drill-down drawer (FE-5).

### FE-3 — Charts A–D — ~1.5d

Recharts, tokens from the design spec.

- **A** — stacked area, up to four series; `unknown` renders in a muted neutral so it reads as
  missing data rather than a fourth acquisition channel.
- **B** — horizontal bar, six buckets, click → drawer filtered to that bucket.
- **C** — horizontal bar top-10; bar length = enrollments, colour = completion rate; click sets
  the global `courseId`.
- **D** — donut over four statuses.

### FE-4 — Reflection zone — ~1d

Radar over six categories plus the three KPI chips.

**A `null` category must not plot as 0.** Render the axis label greyed with no point, or drop to
a bar chart per category — the rule from BE-4 wins over the chart type. A radar quietly
collapsing an absent category to the origin is a chart that lies.

Comments list: text, course title, submission date, paginated.

### FE-5 — Drill-down drawer and export — ~0.5d

One drawer component, one endpoint (`/students`), opened by KPI cards and progress buckets
alike. Paged table.

Export menu: CSV downloads directly; **PDF shows progress** — it takes seconds, not
milliseconds, and a button that appears to do nothing for eight seconds gets clicked four more
times. Both hidden without `dashboard:export`.

### FE-6 — States, responsive, i18n — ~1d

Skeleton per zone; empty state per zone keyed on the array being empty, never on a zero total;
error per zone with retry. Tablet 2-col, mobile 1-col with a horizontally scrolling KPI row.
All labels through Epic 6.

---

## 4. Acceptance criteria

| # | Scenario | Pass |
|---|---|---|
| AC-1 | Seven KPI cards render and follow the period filter | `/kpis` |
| AC-2 | Course filter isolates every zone to one course | `courseId` on all endpoints |
| AC-3 | Group filter aggregates the group's courses | `groupId` |
| AC-4 | Enrollments over time stacks by source, with `unknown` for null | 4 series max |
| AC-5 | Six progress buckets, mutually exclusive, summing to the total | bucket order per BE-3 |
| AC-6 | KPI or bucket click lists the underlying students | `/students` drawer |
| AC-7 | CSV opens in Excel with Vietnamese names intact | UTF-8 BOM |
| AC-8 | PDF renders `Nguyễn Thị Hường` correctly | font-noto in the image |
| AC-9 | Empty result shows "No data available", never a zero chart | empty array, not zero total |
| AC-10 | Reflection shows total responses, response rate, six category averages | `/reflection` |
| AC-11 | A category with no answers is absent, not zero | `null` passthrough |
| AC-12 | Comments list shows text, course and date | `/reflection/comments` |
| AC-13 | No `dashboard:view` → 403 on every endpoint, drill-down included | `PermissionGuard` |
| AC-14 | An enrollment at 00:30 Vietnam time counts on that Vietnam day | `AT TIME ZONE 'Asia/Ho_Chi_Minh'` |
| AC-15 | Completion rate is cohort-based and cannot exceed 100% | BE-2 query |
| AC-16 | Teaching accounts are not counted as students | role 4 + backfill |

---

## 5. Sequence

| Phase | Work | Size |
|---|---|---|
| 1 | BE-0 role + backfill, BE-8 indexes | ~1d |
| 2 | BE-1 metrics module + timezone | ~1d |
| 3 | BE-2 KPIs, BE-3 charts | ~3d |
| 4 | BE-4 reflection, BE-5 drill-down | ~1.5d |
| 5 | BE-6 CSV, BE-7 PDF | ~2d |
| 6 | BE-9 permissions + tests | ~1d |
| 7 | FE-1…FE-6 | ~6d |
| 8 | AC-1…AC-16 | ~0.5d |

BE-1 gates everything after it: the metric definitions are the product. FE-1 can start once
`/kpis` returns a shape, ahead of the rest.

## 6. Prerequisites outside this epic

- **Master-data cleanup.** The dev database holds 605 `course_level` and 304 `course_category`
  codes, mostly test residue (Epic 4.2 §4.1). The Course Group select is built from the same
  master data and is not demoable until `npm run clean:master-data -- --apply` has run. Still
  awaiting approval.
- **Epic 4.1 D4** should be told that BE-7 exists — see the note in that task.

*End of EPIC-07.*
