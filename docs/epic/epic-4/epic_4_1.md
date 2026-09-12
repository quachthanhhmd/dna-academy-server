# Epic 4.1 — Completion & Certificate Screen (`STU_CER_10`)

> **Relationship to other epics.** This file specs the one screen Epic 4 v2.3 left out
> (`STU_CER_10` — "out of this file's scope"). For everything else — catalog, overview,
> enrolment, player, progress, quiz, reflection — **`epic_4_course_journey_v2.md` (v2.3) is
> the source of truth**. This file adds to it; it does not patch it.
>
> **Changelog vs the first draft (2026-09-05):**
> - **Section B deleted.** It was a delta against `epic_4_course_discovery_enrollment.md`
>   with hard line numbers (386, 419, 511–514, …). That file has been removed from the repo,
>   and every item B1–B9 was already shipped and already documented in v2.3 §4. Applying it
>   was impossible and unnecessary. See §0 for the evidence.
> - **Seven API details corrected against the running code** — `reviewText` (not `review`),
>   `/career-reflection-questions/grouped` (not the bare path), `certificate.id`, ISO
>   `completionDate`, `GET /rating` returning `null`, table names, and the certificate
>   number format, which is already implemented.
> - **Six decisions taken** (§2) so the epic is buildable: option storage for
>   `radio`/`select`, scale direction, the verify route, PDF download scope, who authors the
>   career-reflection questions, and the missing course context on the certificate response.
> - **The screen needed three calls to assemble one view** — `/certificate` for the snapshot,
>   `/students/me/courses` for the course id and slug, `/courses/:slug` for the pathway groups.
>   D6 returns the course context from the certificate endpoint, where it is already loaded.
> - **Two screens added** that the first draft implied but never specced: the public verify
>   page and the admin question editor.

---

## 0. What was dropped from the first draft, and why

Every row below was in Section B as "work to do". All of it is already in the codebase.

| Draft item | Where it already lives |
|---|---|
| B1 — catalog `sortBy`, `minDurationSecs`, `maxDurationSecs`, `hasCertificate` | `src/course-catalog/dto/find-courses-catalog.dto.ts:99,119,128` |
| B1/B2 — `primaryInstructor` / `coInstructors` replacing `instructorName` | Epic 5, shipped |
| B2 — `requiresSequentialCompletion` | migration `1786400000000-AddCourseJourneyV2.ts:25` |
| B2 — per-lecture `progressStatus` / `isLocked` / `lockReason` / `watchDurationSecs` | v2.3 §4.2, shipped |
| B3 — `enrollmentSource` ENUM | migration `1786400000000:35,46` |
| B3 — `ux_active_enrollment` partial unique index | same migration |
| B3 — enrol rate limit 5/min + `Idempotency-Key` | `src/course-catalog/course-catalog.controller.ts:97-124` |
| B3 — `courseThumbnailUrl`, `certificateId`, `hasCertificate`, `isArchived` on My Courses | `src/course-catalog/dto/my-course.dto.ts:50,56,64,71` |
| B4/B5 — stores, pages, CTA six-state machine | v2.3 §3.1, §5.1–5.3 |
| B6/B7/B8 — contract summary, ACs, "known gaps" deletions | v2.3 §4.1, §8 |

**Rule going forward:** never write a delta against another spec file by line number. State the
end contract; let the reader diff.

---

## 1. Scope

| Screen ID | Name | Status |
|---|---|---|
| `STU_CER_10` | Completion & Certificate | **MODIFY** — bind the mockup's hardcoded values to real data (§4.1) |
| `STU_CVF_11` | Public certificate verification | **ADD** (§4.4) |
| `ADM_CRQ_20` | Career Reflection Questions (admin editor) | **ADD** (§4.5) |

**Personas:** Student (owner of the enrolment), Guest (verification only), Admin (authoring).

**Entry point:** v2.3 §4.5 — when `POST /lectures/:id/progress` returns
`enrollmentStatus === 'completed'`, the player shows `<CompletionToast />` and redirects to
`STU_CER_10` after 3s. `STU_CER_10` is also reachable from My Courses via the
`certificateId` shortcut on a completed enrolment.

---

## 2. Decisions taken in this revision

Each of these was ambiguous or unbacked in the first draft. A default is chosen so the epic is
buildable; the rationale says what it would cost to choose otherwise.

### D1 — `radio` / `select` questions get an `options` JSONB column

The first draft added `question_type IN ('slider','radio','select')` but only `label_min` /
`label_max` — which describe the two ends of a **slider**. There was nowhere to store
"Low / Med / High" or "Perfect / Good / Need Practice", so the form could not have been
data-driven, which was the whole point of the change.

**Decision:** add `options jsonb NULL`. Required for `radio` and `select`, must be `NULL` for
`slider`. `label_min` / `label_max` are the mirror: required for `slider`, `NULL` otherwise.

### D2 — the scale always runs low → high, and the stored value is the option's own `value`

The draft encoded the answer as a 1-based **index**, with two examples pointing in opposite
directions: `radio` was Low=1 … High=3 (higher = better) while `select` was Perfect=1 …
Need Practice=3 (higher = worse). Both land in the same `ratingAnswer` column and the same
`category` bucket — averaging them produces a meaningless number, and `category` exists
precisely to be aggregated (v2.3 §2.1).

**Decision:** the stored value is the option's explicit `value`, not its array position, and
**every scale is authored ascending from least to most positive**. `Need Practice` is `1`,
`Perfect` is `3`. Validation enforces the value is one of the question's declared option
values (or within `[1,5]` for a slider), so a bad payload is a 422 rather than silent noise in
the dashboard.

### D3 — public verification lives at `/certificate-verify/:number` and returns a masked name

Two problems with `GET /certificates/verify/:number`:

1. **Route collision.** `/certificates` is owned by the generated CRUD controller, which has
   `@Get(':id')` behind `PermissionGuard('courses','edit')`
   (`src/certificates/certificates.controller.ts:82`). A public `verify` segment registered
   from another module can be swallowed by `:id`, and which one wins depends on module
   registration order. This is the same collision class already flagged in the Epic 4
   implementation report (decision 04).
2. **Enumeration.** Certificate numbers come from a Postgres sequence starting at 1
   (`1786500000000-AddCertificateNumberSequence.ts:30`), so `DNA-2026-000001` upward walks the
   entire student roster. A public endpoint returning full names hands over the customer list.

**Decision:** path is `GET /certificate-verify/:number` — a distinct top-level path, no
ambiguity, no dependency on module order. The response masks the student name
(`Alex R.`) and the endpoint is rate-limited. Full name is shown only to the certificate
owner via `GET /enrollments/:id/certificate`.

*Reversible:* if the generated `/certificates` CRUD is removed (the report offers this), the
route can move to `/certificates/verify/:number` with no other change.

### D4 — no server-side PDF rendering in V1; the Download button prints client-side

The draft's `GET /enrollments/:id/certificate/download` renders a PDF on the fly. That pulls
headless Chromium into the API image — the exact dependency V1 deliberately avoided
(`src/learning/services/certificate-generator.service.ts:14-20`). It is an infrastructure
decision (image size, memory ceiling, cold start, request timeouts), not one endpoint.

**Decision for V1:** `<CertificateCard />` is a print-styled DOM node and the Download button
calls `window.print()` scoped to it. `fileUrl` stays `null` and no longer contradicts the
button. §3.2 specs the server-rendered endpoint fully so V1.1 can drop it in without redesign —
and when it lands it must **render once, store `file_id`, and thereafter serve the stored
file**, not re-render per download.

### D5 — career-reflection questions get a real admin surface

Making the form data-driven means somebody has to author `questionText`, `questionType`,
`options`, `labelMin/Max` and `category`. Today the only way in is the generated CRUD at
`/career-reflection-questions` behind `courses:edit` — and v2.3 §4.14 explicitly tells the FE
not to build against generated CRUD.

**Decision:** add `/admin/career-reflection-questions` behind `PermissionGuard` and the
`ADM_CRQ_20` screen (§3.2, §4.5).

### D6 — the certificate response carries the course context, at the root

`GET /enrollments/:id/certificate` returned snapshot strings only. But the screen also needs
`courseId` to load the reflection questions and the course's group to render the pathway card —
so the FE had to call `/students/me/courses` for the id and slug, then `/courses/:slug` for the
groups. Three round trips, and a completion screen depending on the catalog.

**Decision:** return the course context from this endpoint, **at the response root rather than
inside `certificate`** — because the `ready: false` branch has no `certificate` object at all,
and that is exactly the branch that needs the course, the progress and a way back to the
unfinished lecture. Nesting it under `certificate` would fix the happy path and leave the empty
state making the same two extra calls.

Cost: `enrollment.course` is already `eager: true`
(`enrollment.entity.ts:79`) and `findOwnEnrollment` loads the enrollment in every one of these
handlers, so `course` and `progressPct` are **free** — they are being discarded today.
`pathway` costs one query through `CourseGroupAssignmentsService`, the same service
`CourseOverviewService` uses; `lastLectureId` needs `relations: ['lastLecture']` added to
`EnrollmentRepository.findById`, which is `eager: false` today.

Net: `STU_CER_10` drops from six calls to four, and the not-complete branch from two to one.

*Not folded in:* rating, questions and answers stay separate endpoints. They are shipped
contracts used elsewhere, and merging them here would duplicate them into a god-endpoint that
has to be kept in sync.

---

## 3. BE work

### 3.1 Migration — `1786800000000-AddCareerReflectionQuestionTypes`

> ⚠️ **Table names in this codebase are singular and column names are quoted camelCase.**
> The draft's `ALTER TABLE career_reflection_questions` would have failed — the table is
> `career_reflection_question`. Same for `certificate`, `enrollment`, `course`, `lecture`.

```sql
-- Question rendering metadata. Existing rows are sliders, which is what the
-- current hardcoded form draws, so the default keeps them rendering unchanged.
ALTER TABLE "career_reflection_question"
  ADD COLUMN "questionType" varchar(20) NOT NULL DEFAULT 'slider',
  ADD COLUMN "labelMin"     varchar(100),
  ADD COLUMN "labelMax"     varchar(100),
  ADD COLUMN "options"      jsonb;

ALTER TABLE "career_reflection_question"
  ADD CONSTRAINT "ck_crq_question_type"
    CHECK ("questionType" IN ('slider','radio','select'));

-- D1: a slider is described by its two end labels; radio/select by their options.
-- Neither shape may borrow the other's fields.
ALTER TABLE "career_reflection_question"
  ADD CONSTRAINT "ck_crq_shape" CHECK (
    ("questionType" =  'slider' AND "options" IS NULL)
 OR ("questionType" <> 'slider' AND "options" IS NOT NULL
     AND jsonb_typeof("options") = 'array'
     AND jsonb_array_length("options") BETWEEN 2 AND 7)
  );

-- Backfill the six existing seeded sliders so nothing renders without end labels.
UPDATE "career_reflection_question"
   SET "labelMin" = COALESCE("labelMin", 'Disagree'),
       "labelMax" = COALESCE("labelMax", 'Agree')
 WHERE "questionType" = 'slider';
```

`options` shape — one entry per choice, ordered by `displayOrder`, **ascending least → most
positive** (D2):

```jsonc
[ { "value": 1, "label": "Need Practice", "labelTranslations": { "vi": "Cần luyện thêm" } },
  { "value": 2, "label": "Good",          "labelTranslations": { "vi": "Tốt" } },
  { "value": 3, "label": "Perfect",       "labelTranslations": { "vi": "Rất tốt" } } ]
```

`labelTranslations` follows the Epic 6 JSONB convention: `label` holds the default locale
(`vi`) and `labelTranslations` holds the overrides, resolved with
`coalesce(labelTranslations->>locale, label)`. `labelMin` / `labelMax` get the same treatment
via `labelMinTranslations` / `labelMaxTranslations` — **or**, if that feels heavy for two
strings, model both ends as a two-entry `options` array and drop the label columns entirely.
Pick one before implementing; do not ship half-localized labels, which is what the first draft
would have produced.

**Answer storage — no schema change.** `career_reflection_answer.ratingAnswer` (int, nullable)
holds the chosen option `value` for all three types. `textAnswer` stays reserved for a future
free-text type and is unused in V1.

### 3.2 Endpoints

#### MODIFY — `GET /enrollments/:id/certificate`

Add `issuerName` to the certificate, and the **course context at the response root** (D6). This
is the endpoint that makes `STU_CER_10` renderable from one call instead of three.

```jsonc
// ready: true
{ "ready": true,

  // D6 — root level, present in BOTH branches
  "course": {
    "id": "uuid",                                  // → /career-reflection-questions/grouped?courseId=
    "slug": "advanced-genomic-sequencing",
    "title": "Advanced Genomic Sequencing",
    "thumbnailUrl": "https://…"
  },
  "progressPct": 100,
  "lastLectureId": "uuid",                         // null when never started
  "pathway": { "groupId": "uuid", "name": "Data & AI" },   // null ⇒ hide the card

  "certificate": {
    "id": "uuid",                                  // already returned — the draft omitted it
    "number": "DNA-2026-000123",
    "studentName": "Alex Rivera",
    "courseTitle": "Advanced Genomic Sequencing",  // snapshot; may differ from course.title
    "completionDate": "2026-10-24T00:00:00.000Z",  // ISO datetime, not "2026-10-24"
    "issuerName": "DNA Learning Academy",          // NEW — from CERTIFICATE_ISSUER_NAME
    "finalGradePct": 96,                           // Epic 4.5 §1.5 — frozen at issue, null if no quiz
    "gradeLabel": "A+",                            // Epic 4.5 — derived from the above
    "issuedAt": "2026-10-24T09:12:00.000Z",
    "fileUrl": null                                // stays null in V1 (D4)
  } }

// ready: false — same course context, no certificate
{ "ready": false,
  "course": { "id": "uuid", "slug": "…", "title": "…", "thumbnailUrl": "…" },
  "progressPct": 62,
  "lastLectureId": "uuid",
  "pathway": { "groupId": "uuid", "name": "Data & AI" },
  "certificate": null }
```

Implementation notes, so this stays as cheap as it looks:

- `course` and `progressPct` come off the enrollment `findOwnEnrollment` already loaded —
  `enrollment.course` is `eager: true` (`enrollment.entity.ts:79`). **Zero extra queries**;
  today the data is fetched and then discarded.
- `pathway` is **one** query via `CourseGroupAssignmentsService.findByCourseId` — the same
  service `CourseOverviewService` uses (`course-overview.service.ts:153`). When a course has
  several groups, take the one with the **lowest `displayOrder`**, tie-broken by name, so the
  card does not change between requests. `null` when the course has no group.
- `pathway.name` resolves through `MasterDataCodeMapper.toDomain`, so it is already localized
  by the Epic 6 locale chain — no extra work.
- `lastLectureId` needs `relations: ['lastLecture']` on `EnrollmentRepository.findById`
  (`eager: false` today), or a raw FK select. It is what the not-complete state links to.
- `certificate.courseTitle` stays the **snapshot** and `course.title` is the live value. They
  can legitimately differ after a retitle; render the snapshot on the certificate and the live
  title in the page chrome.

**The certificate carries the final grade (Epic 4.5 §1.5).** It is frozen at issue time and
never recomputed — not by a retake, not by a progress reset, not by `regenerate`, which
corrects who the certificate is for and never what was earned. `null` means no quiz was
submitted before issue; render no grade row rather than `0%`.

**An issued certificate is never withdrawn (4.2 D8).** `ready` keys on the
certificate, not on `enrollments.status`: once a certificate exists this
endpoint returns `ready: true` for the life of the enrolment, even if
`progressPct` has since fallen below 100 because an admin added a required
lecture. The number may already be public on `STU_CVF_11`, so taking it back
is not an option the API has.

**`ready: false` means "the course is not finished", not "the PDF is rendering."** The
certificate record is issued **synchronously** inside `CompletionDetectorService`
(`completion-detector.service.ts:93`), and `getCertificate` issues it as a fallback for
pre-epic enrolments (`completion.service.ts:52`). There is no asynchronous step, so **the FE
must not poll** — polling would spin forever and the draft's "Your certificate is being
prepared" copy would be a lie. See §4.2 for the correct empty state.

#### ADD — `GET /certificate-verify/:number` *(public, rate-limited)*

```jsonc
// 200
{ "valid": true,
  "number": "DNA-2026-000123",
  "studentName": "Alex R.",                        // masked — D3
  "courseTitle": "Advanced Genomic Sequencing",
  "completionDate": "2026-10-24T00:00:00.000Z",
  "issuerName": "DNA Learning Academy" }

// 404 — unknown number. Deliberately the same body for malformed and not-found,
// so the endpoint does not confirm which numbers exist.
{ "valid": false }
```

- Snapshot columns only (`studentNameSnapshot`, `courseTitleSnapshot`, `completionDate`). No
  enrolment id, no course id, no student id, no email.
- Masking rule: first given name in full, then the initial of the last token + `.`
  (`Nguyễn Văn A` → `Nguyễn V. A.` is wrong; use `Nguyễn A.` — first token + last token's
  initial). Implement it in one helper with unit tests; it is the only thing standing between
  a sequential id and the customer list.
- Rate limit **20/min per IP**, same in-process limiter as enrol (v2.3 §4.12) — over that,
  `429 { code: 'RATE_LIMITED', retryAfterSecs }`.

#### ADD — `/admin/career-reflection-questions` *(D5)*

| Method | Path | Permission |
|---|---|---|
| `GET` | `/admin/career-reflection-questions?courseId=&isActive=` | `courses:view` |
| `POST` | `/admin/career-reflection-questions` | `courses:create` |
| `PATCH` | `/admin/career-reflection-questions/:id` | `courses:edit` |
| `PATCH` | `/admin/career-reflection-questions/:id/deactivate` | `courses:edit` |

Body: `{ questionText, questionType, category?, options?, labelMin?, labelMax?, courseId?, displayOrder, isActive }`.
`courseId: null` creates a global question shown on every course. No hard delete — deactivate,
the same pattern as master data codes (Epic 2 §5), because answers reference these rows.

Once this exists, **remove the generated `/career-reflection-questions` CRUD controller.** It
is the thing forcing the public read to sit at `/grouped` (v2.3 §4.1); freeing the path is a
follow-up, not part of this epic, and until then the `/grouped` suffix stays.

#### ADD — `DELETE /admin/enrollments/:id/progress` *(4.2 §3.2)*

`courses:edit`. Clears `lecture_progress`, `quiz_attempts`,
`quiz_attempt_answers`, `quiz_saves`, `reflection_responses` and
`career_reflection_answers` for the enrolment, then resets it to
`status: 'enrolled'`, `progressPct: 0`, `startedAt: null`, `completedAt: null`,
`lastLecture: null`. Returns `200 { enrollmentId, certificateRetained }`.

**The certificate is not deleted** — its number may already be public on
`STU_CVF_11`, and `issueFor` is idempotent per enrolment, so re-completing the
course hands back the same number. Every call is logged with the acting admin.

#### V1.1 (specced, not built) — `GET /enrollments/:id/certificate/download`

JWT + ownership. Behaviour when it lands: if `certificate.file` is null, render the PDF,
upload to R2, persist `file_id`, then stream; otherwise stream the stored file.
`Content-Disposition: attachment; filename="DNA-<number>.pdf"`. Once a file exists,
`GET .../certificate` must start returning it as `fileUrl` — and
`POST .../certificate/regenerate` must clear `file_id` so the next download re-renders from
the corrected snapshot.

### 3.3 Validation & business rules

- `questionType` must match the shape constraints in §3.1 — a `radio` without `options`, or a
  `slider` with them, is `422 { errors: { options: 'requiredForType' | 'notAllowedForType' } }`.
- On submit, each `ratingAnswer` must be a declared option `value` for that question
  (`radio`/`select`) or within `[1,5]` (`slider`) →
  `422 { errors: { answers: 'invalidValue:<questionId>' } }`.
- Unknown question id stays `422 { errors: { answers: 'unknownQuestion:<id>' } }` (v2.3 §4.13).
- Inactive questions are excluded from the public read and rejected on submit.
- Verification reads only `certificate`; it never joins `user` or `enrollment`.

### 3.4 Environment variables

| Key | Default | Consumed by | Purpose |
|---|---|---|---|
| `CERTIFICATE_ISSUER_NAME` | `DNA Learning Academy` | `CompletionService`, verify handler | Issuer label on the card and the verify page |
| `CERTIFICATE_SIGNATURE_URL` | *(empty)* | `<CertificateCard />` via the certificate DTO | Signature image; empty → a placeholder stroke is drawn |

Both are validated at boot like `QUIZ_PASS_THRESHOLD_DEFAULT` and `REFLECTION_MIN_WORDS`
(v2.3 §2.4.1): non-empty string for the issuer, valid URL or empty for the signature. Fail
fast rather than rendering a blank issuer onto a certificate.

---

## 4. FE work

### 4.1 `STU_CER_10` — bind the hardcoded mockup to data

| Mockup hardcode | Source |
|---|---|
| "Alex Rivera" | `certificate.studentName` |
| "Advanced Genomic Sequencing" | `certificate.courseTitle` |
| "Oct 24, 2024" | `certificate.completionDate` — **ISO datetime, format client-side** |
| "DNA-2024-98421" | `certificate.number` — real format is `DNA-YYYY-NNNNNN`, six digits |
| "Issued by DNA Learning Academy" | `certificate.issuerName` |

**Download Certificate** (currently dead) → `window.print()` on the `<CertificateCard />` print
stylesheet (D4). Ship the print CSS with the card; do not rely on the browser's default.

**Star rating** (currently static) → interactive.
- Prefill from `GET /enrollments/:id/rating`. **It returns `200` with a `null` body when the
  student has not rated yet** — not `404`. Handle null as "first time".
- Submit disabled until ≥ 1 star. Body is `{ rating, reviewText? }` — **`reviewText`, not
  `review`**. The server runs `whitelist: true`, so `review` would be dropped silently, the
  call would return `200`, and the text would never be saved (v2.3 §4.16).
- With an existing rating, relabel to "Update Feedback". Editing is unlimited and allowed at
  any time after completion — this closes v2.3 §7 Q4.

**Career Reflection form** (currently six hardcoded questions) → data-driven from
`GET /career-reflection-questions/grouped?courseId=<course.id>` — the `courseId` comes from
the certificate response's root `course.id` (D6), **not** from a detour through
`/students/me/courses`. Note the `/grouped`
suffix: the bare `/career-reflection-questions` path is the admin CRUD behind
`courses:edit` and answers `403` to a student token.
- Response is an object keyed by `category`, plus an `uncategorized` bucket. Key order is not
  guaranteed — render the buckets in an order you define.
- Render each question by `questionType`: `slider` → `labelMin`/`labelMax` at the ends;
  `radio` → one control per `options[]` entry; `select` → dropdown from `options[]`.
- Prefill from `GET /enrollments/:id/career-reflection`, which returns
  `[{ questionId, textAnswer, ratingAnswer, submittedAt }]`.
- **Save Reflection** → `POST /enrollments/:id/career-reflection` with
  `{ answers: [{ questionId, ratingAnswer }] }` — send the option's `value`, never its array
  index (D2). `POST` upserts, so it doubles as edit.

**Explore Pathway** (currently `href="#"`) → **use the course group the course already
carries.** The certificate response returns `pathway: { groupId, name } | null` (D6), so the
card renders `name` and links to `/courses?groupId=<pathway.groupId>` — an existing catalog
filter. Hide the card when `pathway` is `null`. No call to `/courses/:slug`, and no dependency
on `useMasterDataStore` being warm, which it will not be on a deep link into this screen.

> The first draft linked to `/courses?careerFieldId=<id>`. **`careerField` does not exist
> anywhere in the schema, the DTOs or the catalog query** — and because unknown query keys are
> dropped by the validation pipe, the link would have silently returned the unfiltered
> catalog. If a real "career pathway" taxonomy is wanted later (distinct from course groups),
> it needs its own model and its own epic; §7 Q1.

### 4.2 States to add

| State | Trigger | Render |
|---|---|---|
| Not complete | `ready: false` | "You haven't finished this course yet" + `progressPct` bar + a "Continue learning" button to `lastLectureId` — all three from the same response (D6), no second call. **No spinner, no polling** — see §3.2 |
| Loaded | `ready: true` | Certificate card + feedback form + reflection form |
| Rating already given | `GET /rating` → non-null | Stars prefilled, button reads "Update Feedback" |
| Reflection saved | `POST` → `200` | Success toast; keep the form editable (POST upserts) rather than disabling it |
| Verify link | always | Copyable `/verify/<number>` URL + QR, pointing at `STU_CVF_11` |

### 4.3 Components

`<CertificateCard />` (print-styled), `<CertificateDownloadButton />` (print trigger),
`<CertificateVerifyLink />`, `<RatingInput />`, `<FeedbackForm />`,
`<CareerReflectionForm />` (dispatches on `questionType`), `<NextStepCard />`,
`<CourseNotCompleteState />` *(renamed from `<CertificateLoadingState />` — it is not a
loading state)*.

### 4.4 `STU_CVF_11` — public verification page

Route `/verify/[number]`. Unauthenticated, indexable-safe. Calls
`GET /certificate-verify/:number`.
- `valid: true` → a compact card: masked name, course title, completion date, issuer, plus a
  "This certificate is valid" badge.
- `valid: false` / `404` → "No certificate matches this number." Do not distinguish a
  malformed number from an unknown one.
- `429` → "Too many checks, try again in N seconds."
- No login prompt, no enrolment data, no link back into the app's authenticated area beyond
  the public homepage.

### 4.5 `ADM_CRQ_20` — Career Reflection Questions

Table (question text, type, category, scope `Global | <course>`, order, active) with a
create/edit drawer. The drawer switches its lower half on `questionType`: two label inputs for
`slider`, a repeatable option list (`label` + auto-assigned ascending `value`) for
`radio`/`select`. Show the ascending-scale rule inline — "order from least to most positive" —
because D2's aggregation correctness depends on the author following it.

---

## 5. API integration

### 5.1 Endpoint map

The screen is four calls in two waves. Wave 1, in parallel from the `enrollmentId` in the
route: certificate, rating, my answers. Wave 2, once the certificate lands: the question list,
keyed on `course.id` from that response. The pathway needs no call at all.

Before D6 this was six calls and the chain was three deep — `/certificate` → `/students/me/courses`
for the id and slug → `/courses/:slug` for the groups → questions.

| Surface | Method | Endpoint | Auth | Body / query |
|---|---|---|---|---|
| Load certificate **+ course + progress + pathway** | `GET` | `/enrollments/:id/certificate` | JWT + onboarding + ownership | — |
| Download | *(client-side print in V1)* | — | — | — |
| Verify | `GET` | `/certificate-verify/:number` | **public** | — |
| Load rating | `GET` | `/enrollments/:id/rating` | JWT + onboarding + ownership | — |
| Submit / update rating | `POST` \| `PUT` | `/enrollments/:id/rating` | ″ | `{ rating, reviewText? }` |
| Load reflection questions | `GET` | `/career-reflection-questions/grouped?courseId=` | **public** | — |
| Load my answers | `GET` | `/enrollments/:id/career-reflection` | JWT + onboarding + ownership | — |
| Save reflection | `POST` | `/enrollments/:id/career-reflection` | ″ | `{ answers: [{ questionId, ratingAnswer }] }` |
| Explore pathway *(link target, not a data source)* | `GET` | `/courses?groupId=<pathway.groupId>` | public | — |
| Admin: questions | `GET`/`POST`/`PATCH` | `/admin/career-reflection-questions` | `courses:view/create/edit` | §3.2 |
| Admin: re-issue | `POST` | `/enrollments/:id/certificate/regenerate` | `courses:edit` | — |

### 5.2 Field-name traps

These are the ones that fail **silently** under `whitelist: true`:

| Wrong | Right |
|---|---|
| `review` | `reviewText` |
| `careerFieldId` | `groupId` |
| `/career-reflection-questions?courseId=` | `/career-reflection-questions/grouped?courseId=` |
| `answers[].ratingAnswer` as array index | the option's declared `value` |

### 5.3 Error codes (additions to v2.3 §4.15)

| Status | Body | FE |
|---|---|---|
| `403` | `{ error: 'notYourEnrollment' }` | Bug — the app opened someone else's record |
| `404` | `{ valid: false }` (verify only) | "No certificate matches this number" |
| `422` | `{ errors: { answers: 'invalidValue:<questionId>' } }` | Field error on that question |
| `422` | `{ errors: { answers: 'unknownQuestion:<id>' } }` | Refetch the question list — it changed under you |
| `422` | `{ errors: { options: 'requiredForType' \| 'notAllowedForType' } }` | Admin editor only |
| `429` | `{ code: 'RATE_LIMITED', retryAfterSecs }` | Back off |

Everything else — `401`, `403 ONBOARDING_REQUIRED`, `403 PERMISSION_DENIED` — behaves exactly
as v2.3 §4.15 describes.

---

## 6. Acceptance criteria

| Requirement | Implementation |
|---|---|
| Certificate card shows real student, course, date, number and issuer | `GET /enrollments/:id/certificate` + `CERTIFICATE_ISSUER_NAME` |
| An incomplete course shows why, not a spinner | `ready: false` → `<CourseNotCompleteState />` with `progressPct` and `lastLectureId` from the same response, no polling |
| The screen assembles without a detour through the catalog | `GET /enrollments/:id/certificate` carries `course`, `progressPct`, `lastLectureId`, `pathway`; no call to `/students/me/courses` or `/courses/:slug` |
| Download produces a certificate file | V1: print stylesheet on `<CertificateCard />`; V1.1: server-rendered PDF cached in `file_id` |
| A certificate can be checked by a third party | `GET /certificate-verify/:number` → `STU_CVF_11` |
| Verification does not leak the student roster | Masked name, snapshot-only fields, 20/min per IP, identical 404 for unknown and malformed |
| Rating is interactive, prefilled and editable | `GET`/`POST` `/enrollments/:id/rating`, `reviewText`, unlimited edits |
| Review text actually persists | Field named `reviewText`; an e2e asserts it survives `whitelist: true` |
| The reflection form is data-driven | `/career-reflection-questions/grouped`, rendered by `questionType` + `category` |
| `radio` / `select` options come from the server | `options` JSONB column; no labels hardcoded in the FE |
| Aggregated reflection scores are comparable | All scales ascending least → most positive; stored value is the option's `value` |
| Questions are authorable without touching the DB | `/admin/career-reflection-questions` + `ADM_CRQ_20` |
| Explore Pathway leads to a real filtered catalog | `/courses?groupId=<course.groupIds[0]>`; card hidden when empty |
| Labels render in the user's locale | `labelTranslations` per the Epic 6 JSONB convention |

---

## 7. Open questions

1. **Career pathway taxonomy.** V1 reuses `course_group` for Explore Pathway (§4.1). If a
   pathway is meant to be a distinct concept — mapped to the student's `career_interest` from
   onboarding, say — it needs its own table, its own catalog filter and its own epic. Confirm
   the reuse is acceptable for V1.
2. **Certificate number width is already fixed at six digits** — `DNA-YYYY-NNNNNN`
   (`certificate-generator.service.ts:30`), backed by a sequence and a migration whose backfill
   regex assumes that shape. The mockup's five-digit `DNA-2024-98421` is not reachable without
   a new migration. Also note the sequence is **global, not per-year** (the code comment says
   "per-year" but nothing resets it) — so a five-digit format would cap the platform at 99,999
   certificates in total, not per year. Confirm six digits, or raise a ticket for both changes
   together.
3. **Label localization shape** — per-column `*Translations` fields, or fold the slider's two
   ends into a two-entry `options` array (§3.1). Pick one.
4. **Masking format for Vietnamese names** — `Nguyễn A.` (first + last initial) is proposed.
   Confirm it reads correctly to a Vietnamese user before it goes on a public page.
5. **Removing the generated `/career-reflection-questions` CRUD** once `ADM_CRQ_20` ships,
   which frees the public read from its `/grouped` suffix. Worth doing, but it is a breaking
   path change — schedule it deliberately.

---

## 8. Out of scope (V1)

- Server-side PDF rendering and R2 storage of certificates (D4 — specced for V1.1 in §3.2).
- Free-text career-reflection questions (`textAnswer` is reserved but unused).
- Sharing a certificate to LinkedIn / social, and Open Graph cards on `STU_CVF_11`.
- Aggregation dashboards over `category` — the data model here makes them possible; the
  screens are a separate epic.
- Certificate revocation / expiry. `valid` is currently "the record exists".
- Localizing the certificate card itself (student name and course title are user content, not
  master data — Epic 6 §6 keeps those out of scope).

---

*End of Epic 4.1.*
