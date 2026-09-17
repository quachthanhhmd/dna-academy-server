# Epic 7 — API Integration Contract (Admin Overview Dashboard)

> **The handshake.** The server makes this true; the client assumes nothing else. Rules and
> rationale live in [`../EPIC-07-Admin-Overview-Dashboard.md`](../EPIC-07-Admin-Overview-Dashboard.md);
> this file is the shapes.
>
> **Status: shipped on the server, 13/09/2026.** Every payload below was captured from a
> running instance, not written by hand. BE-0 … BE-9 are complete; FE-1 … FE-6 are not started.
>
> **Nothing here existed before.** No endpoint changed, so there is no breaking change for any
> existing client.
>
> **Pending change — not yet in code (17/09/2026).** The permission model
> ([`../epic_1_permission_model.md`](../epic_1_permission_model.md) §1.9) changes three things this
> contract describes. The tables below still state what the server does *today*; update them when
> BE-11 ships, not before, or the contract stops matching the server.
>
> 1. `/students` and `/reflection/comments` require **`dashboard:view_students`**, not `dashboard:view`.
> 2. Every aggregate is **scoped to the caller's primary courses** unless they hold `courses:edit_any`.
>    An instructor who is primary on nothing receives the empty shape, never platform totals.
> 3. "Role-`user` student" means **`user_role` = User**, not `user.role_id` (permission model §2.5).
>
> The client (FE-1 … FE-6) has not started, so building against the post-change rules now avoids a
> second pass.

---

## 1. Endpoints

Base path `/api/v1/admin/dashboard`. All routes: `AuthGuard('jwt')` + `PermissionGuard`.

| Purpose           | Method | Path                     | Permission             |
| ----------------- | ------ | ------------------------ | ---------------------- |
| KPI row           | `GET`  | `/kpis`                  | `dashboard:view`       |
| Chart A           | `GET`  | `/enrollments-over-time` | `dashboard:view`       |
| Chart B           | `GET`  | `/progress-distribution` | `dashboard:view`       |
| Chart C           | `GET`  | `/top-courses`           | `dashboard:view`       |
| Chart D           | `GET`  | `/enrollment-status`     | `dashboard:view`       |
| Reflection zone   | `GET`  | `/reflection`            | `dashboard:view`       |
| Comments list     | `GET`  | `/reflection/comments`   | `dashboard:view`       |
| Drill-down drawer | `GET`  | `/students`              | `dashboard:view`       |
| Download          | `GET`  | `/export`                | `dashboard:**export**` |

`/rating` was dropped in planning: average rating is one KPI and one sparkline, both in `/kpis`.

**403, not 404, and it applies to `/students` too.** The drill-down returns names and emails and
is gated server-side by the same permission as the charts. Hiding the button is not the control.

---

## 2. Shared query parameters

Identical on every endpoint, `/export` included.

| Param        | Type                                            | Default | Notes                                                                               |
| ------------ | ----------------------------------------------- | ------- | ----------------------------------------------------------------------------------- |
| `period`     | `7d \| 30d \| 90d \| quarter \| year \| custom` | `30d`   |                                                                                     |
| `from`, `to` | `YYYY-MM-DD`                                    | —       | **Required** when `period=custom`. Vietnam calendar dates, **both ends inclusive**. |
| `courseId`   | uuid                                            | —       | One course.                                                                         |
| `groupId`    | uuid                                            | —       | `course_group_assignment.group_id`; aggregates every course in the group.           |
| `page`       | int ≥ 1                                         | `1`     | `/reflection/comments`, `/students`.                                                |
| `limit`      | int 1–100                                       | `20`    | Same two. **422 above 100.**                                                        |

`courseId` and `groupId` are **ANDed**. A course outside the group therefore yields an empty
result — that is narrowing, not a bug, and there is a test for it.

**Window semantics.** `7d` is today plus the six days before it, in Vietnam time. `quarter` and
`year` are calendar-to-date. Internally the window is half-open (`>= from AND < to + 1 day`), so
a row stamped 23:59:59.999 is inside it.

**Bucket granularity is not a parameter.** `7d`/`30d` → day, `90d`/`quarter` → ISO week
(Monday), `year` → month; `custom` picks by span (≤31 days → day, ≤180 → week, else month). Two
zones bucketed differently for one filter would not be comparable.

---

## 3. Envelope

Every endpoint, without exception:

```jsonc
{
  "data": {
    /* endpoint-specific */
  },
  "meta": {
    "period": {
      "from": "2026-08-15T00:00:00+07:00",
      "to": "2026-09-13T23:59:59+07:00",
    },
    "courseId": null,
    "groupId": null,
    "timezone": "Asia/Ho_Chi_Minh",
    "generatedAt": "2026-09-13T15:40:47+07:00",
  },
}
```

`meta.period` echoes the **resolved** window with its offset. Do not re-derive it — render it.
A screenshot of the dashboard can then always be tied to an exact range.

---

## 4. The one rule that will bite

**`null` is not `0`.** A null means "not measurable"; a zero is a measurement. They must render
differently — "No data" versus "0".

Where nulls appear: any KPI `value`, `delta.previous`, `delta.pct`, a bucket's `pct`,
`completionRate` for an empty cohort, a reflection option `pct` or `responseShare` when nobody answered,
`responseRate.rate` when nobody completed, `completionRate`/`avgProgress` in `top-courses`.

**And the empty state is keyed on the array, not the total.** When a zone has nothing at all,
`data` comes back with **empty arrays** rather than a zero-filled series:

```jsonc
{ "data": { "buckets": [], "total": 0 }, "meta": { … } }
```

Render the empty panel on `buckets.length === 0`. Never on `total === 0` — a real period with
three zero days has `total: 0` and six populated buckets, and must draw a chart.

When a zone does have data, the series is **gap-filled across the full axis**: every bucket key
between `from` and `to` is present, missing ones at `0` (or `null` for averages and rates, which
have no value to be zero). The x-axis is therefore identical across all seven sparklines.

---

## 5. Payloads

### 5.1 `GET /kpis`

Seven metrics, fixed key order. Each carries a value, a comparison and a sparkline.

```jsonc
{
  "data": {
    "kpis": {
      "registeredStudents": {
        "value": 1,                                  // running total, all time
        "delta": { "current": 0, "previous": 0, "pct": null },
        "series": [ { "bucket": "2026-09-07", "value": 0 }, … ]
      },
      "activeStudents":   { … },
      "enrollments":      { … },
      "completedCourses": { … },
      "completionRate":   { "value": null, "delta": { "current": null, "previous": 50, "pct": null }, "series": [] },
      "avgProgress":      { … },
      "avgRating":        { … }
    }
  },
  "meta": { … }
}
```

| KPI                  | Meaning                                                                                    | Unit  |
| -------------------- | ------------------------------------------------------------------------------------------ | ----- |
| `registeredStudents` | Accounts on role `user`. **Not period-filtered** — a running total.                        | count |
| `activeStudents`     | Distinct role-`user` students whose `last_accessed_at` is in the window.                   | count |
| `enrollments`        | Non-cancelled enrolments created in the window.                                            | count |
| `completedCourses`   | Enrolments that reached `completed` in the window.                                         | count |
| `completionRate`     | **Cohort**: of the enrolments _created_ in the window, the share that has since completed. | %     |
| `avgProgress`        | Mean `progress_pct` over that same cohort.                                                 | %     |
| `avgRating`          | Mean `course_rating.rating` submitted in the window, unmoderated included.                 | 1–5   |

**`delta.current` is not always `value`.** For `registeredStudents` the headline is a running
total while the only meaningful comparison is sign-ups per window, so `current` is
sign-ups-this-window and `previous` is sign-ups-last-window. For the other six,
`current === value`. Render `value` big, `delta.pct` as the chip.

**`delta.pct` is null whenever the previous window is 0 or null.** "Up 100%" from a base of
nothing is not a fact about growth. Render "no comparison".

**Print the cohort window under the completion rate.** This is the most misreadable number on
the page: a cohort from the last 7 days has had 7 days to finish a 6-week course, so its rate is
near zero by construction. `meta.period` has the dates — "of students who enrolled 15/08 –
13/09". The PDF does this; the web UI must too.

### 5.2 `GET /enrollments-over-time`

```jsonc
{
  "data": {
    "sources": ["organic", "admin", "coupon", "unknown"],
    "buckets": [
      { "bucket": "2026-09-07", "total": 0, "organic": 0, "admin": 0, "coupon": 0, "unknown": 0 },
      …
    ],
    "total": 2
  }
}
```

Each bucket is one object with a key per source — feed it straight to a stacked Recharts series.
`sources` is always those four, in that order.

**`unknown` is rows whose `enrollment_source` is null** — written before the column existed.
Render it in a muted neutral. It is missing data, not a fourth acquisition channel, and it is
deliberately not folded into `organic`.

### 5.3 `GET /progress-distribution`

```jsonc
{
  "data": {
    "buckets": [
      { "bucket": "completed", "count": 1, "pct": 50 },
      { "bucket": "not_started", "count": 0, "pct": 0 },
      { "bucket": "1-25", "count": 0, "pct": 0 },
      { "bucket": "26-50", "count": 1, "pct": 50 },
      { "bucket": "51-75", "count": 0, "pct": 0 },
      { "bucket": "76-99", "count": 0, "pct": 0 },
    ],
    "total": 2,
  },
}
```

Six buckets, always all six, always that order, mutually exclusive, and `count` sums to `total`.
Scope is the window's enrolment cohort excluding cancelled, so the total reconciles with the
`enrollments` KPI.

**`progress_pct = 100` with status still `in_progress` lands in `76-99`.** That is a real state —
last lecture finished, completion detector not yet run — and counting it as completed would
break the reconciliation with `completedCourses`.

`bucket` values are the keys the drawer expects (§5.8).

### 5.4 `GET /top-courses`

```jsonc
{
  "data": {
    "courses": [
      {
        "courseId": "2e9f7b9c-…",
        "courseCode": "mit-18642-mathematics-finance-mtpkntlw",
        "title": "MIT 18.642 — Topics in Mathematics with Applications in Finance",
        "enrollments": 2,
        "completionRate": 50,
        "avgProgress": 63.5,
      },
    ],
  },
}
```

At most 10, ordered by `enrollments` desc then title. `completionRate` is that course's own
cohort rate and may be `null`. Clicking a row should set the global `courseId`.

### 5.5 `GET /enrollment-status`

```jsonc
{
  "data": {
    "statuses": [
      { "status": "enrolled", "count": 0, "pct": 0 },
      { "status": "in_progress", "count": 1, "pct": 50 },
      { "status": "completed", "count": 1, "pct": 50 },
      { "status": "cancelled", "count": 0, "pct": 0 },
    ],
    "total": 2,
  },
}
```

All four, `cancelled` included — it is the one worth seeing. Empty window → `"statuses": []`.

### 5.6 `GET /reflection` — superseded by Epic 4.6

> **Changed 15/09/2026.** The six-category radar is gone: the certificate-screen form was reworked
> into two free-text and three single-choice questions, and there are no Likert categories left to
> average. The contract now lives in
> [`../epic-4/epic-4-6-career-reflection-rework.md` §5.7](../epic-4/epic-4-6-career-reflection-rework.md).

In short, `data` is:

```jsonc
{
  "selections": [ { "questionId", "questionText", "displayOrder", "courseId", "answered", "responseShare",
                    "options": [ { "key", "label", "count", "pct" } ] } ],
  "freeText":   [ { "questionId", "questionText", "displayOrder", "courseId", "answered" } ],
  "totalResponses": 1,
  "totalAnswers": 5,
  "responseRate": { "rate": 100, "responded": 1, "completed": 1 }
}
```

`categories` has been **removed**. Draw one bar chart per `selections` entry. `responseRate` is
unchanged.

### 5.7 `GET /reflection/comments` — gains a question filter (Epic 4.6)

New optional `questionId` (take the ids from `data.freeText`). Each item gains `questionId`,
`questionText` and `questionOrder`:

```jsonc
{
  "items": [ { "answerId": "…", "text": "…", "questionId": "…", "questionText": "…",
               "questionOrder": 1, "courseTitle": "…", "submittedAt": "2026-09-15T12:45:01.333Z" } ],
  "total": 2, "page": 1, "limit": 20
}
```

Full contract: [Epic 4.6 §5.8](../epic-4/epic-4-6-career-reflection-rework.md).

### 5.8 `GET /students`

Extra params: `metric` = `enrolled` (default) `| completed | active | progress_bucket`, and
`bucket` — **required** when `metric=progress_bucket`, one of the six keys from §5.3.

```jsonc
{
  "data": {
    "items": [
      {
        "studentId": 2,
        "fullName": "John Doe",
        "email": "john.doe@example.com",
        "courseTitle": "MIT 18.642 — …",
        "enrollmentDate": "2026-09-06T15:33:39.356Z",
        "progressPct": 27,
        "status": "in_progress",
        "completedAt": null,
      },
    ],
    "total": 2,
    "page": 1,
    "limit": 20,
  },
}
```

Each `metric` is windowed on the column that defines its card, so the drawer lists exactly the
rows the card counted — `completed` on `completed_at`, `active` on `last_accessed_at` (and role
`user`, like the card), everything else on `enrollment_date`.

Those eight keys are the whole row. No password, no `social_id`, no tokens — asserted in the
e2e suite.

---

## 6. `GET /export`

| Param     | Values                                                                                                                                                    | Default    |
| --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| `format`  | `csv \| pdf`                                                                                                                                              | `csv`      |
| `dataset` | `overview`, `kpis`, `enrollments-over-time`, `progress-distribution`, `top-courses`, `enrollment-status`, `reflection`, `reflection-comments`, `students` | `overview` |

Plus every shared filter. Response is a file:

```
Content-Type: text/csv; charset=utf-8   |   application/pdf
Content-Disposition: attachment; filename="dashboard-top-courses-20260815-20260913.csv"
```

The filename carries the dataset and the **resolved** window, so a folder of exports is still
readable in six months.

**Exports are unpaginated** (capped at 10 000 rows). A spreadsheet of page 1 of 12 is worse than
no spreadsheet.

### CSV

Starts with a **UTF-8 BOM** — without it Excel on Windows reads the file as Windows-1252 and
every Vietnamese name becomes mojibake. RFC 4180 quoting, CRLF endings. A null is an **empty
field**, never `0` and never the text `null`.

`dataset=overview` as CSV is **422**: the overview is charts and seven scalars, and flattening
that into one sheet produces a table of nothing in particular.

### PDF

Synchronous — one request returns the file, typically 1–3 seconds. Show a spinner, and disable
the button while it is in flight.

| Status | Meaning                                                                    |
| ------ | -------------------------------------------------------------------------- |
| `200`  | The PDF.                                                                   |
| `422`  | Unknown dataset, or a bad period.                                          |
| `503`  | `tooManyConcurrentExports` — more than 2 renders already running. Retry.   |
| `503`  | `chromiumNotFound` — the deployment is missing its browser. Not retryable. |
| `504`  | `renderTimedOut` after 30s.                                                |

`dataset=overview` renders the full report: KPI cards, enrolments stacked by source, progress
distribution, a status donut, top courses and the reflection summary. Any other dataset renders
that dataset as a table. Vietnamese renders correctly — the image ships `font-noto`, and the
suite asserts `Nguyễn Thị Hường` survives into the PDF's text layer.

---

## 7. Errors

| Status | When                                                                                                                                                                                                                                       |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `401`  | No/!valid token.                                                                                                                                                                                                                           |
| `403`  | Authenticated but lacking `dashboard:view` (or `dashboard:export`). Body: `{ code: 'PERMISSION_DENIED', required: { module, action } }`.                                                                                                   |
| `422`  | `period=custom` without `from`/`to`; a date that is not `YYYY-MM-DD` or not on the calendar; `to` before `from`; `limit > 100`; `metric=progress_bucket` without `bucket`; unknown `period`/`dataset`/`format`; `dataset=overview` as CSV. |

Validation errors follow the project shape: `{ "status": 422, "errors": { "<field>": "<code>" } }`.

---

## 8. Notes the client needs, that are not in the payload

1. **Permissions drive the UI.** Gate the route on `dashboard:view` and the export menu on
   `dashboard:export`, but treat that as cosmetics — the server enforces both.
2. **All four filters belong in the URL** (`?period=30d&courseId=…`), so back restores the
   previous view and a filtered dashboard can be pasted into a message.
3. **Zones are independent queries.** One failure renders that zone's error state; the rest of
   the page stands.
4. **`instructor` is a new role (id 4).** Teaching accounts were moved off role `user`, so
   student counts exclude them from now on. Any client-side check of `roleId === 2` to mean
   "is a learner" still holds; a check of `!== 1 && !== 3` to mean the same does not.
5. **Master-data cleanup is still a prerequisite** for a demoable Course Group select — the dev
   database holds ~60 junk `UR Custom Role` rows and hundreds of junk course codes
   (EPIC-07 §6). Not blocking the API.

_End of Epic 7 API contract._
