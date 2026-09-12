# Epic 4.2 — FE Alignment Plan

> **The client half of the same corrective pass.** The server work in
> [`epic_4_2_journey_fixes.md`](./epic_4_2_journey_fixes.md) shipped on 06/09/2026 and changed
> three things the client can see: a response gained fields, a payload gained fields, and a
> write gained a validation rule. This document says which client code that touches — and,
> just as deliberately, which client code it does **not**.
>
> **Repo:** `dna-academy-client` (Next.js). Every path below is relative to that repo's root.
> **Verified against the client working tree on 06/09/2026,** not against the spec prose: each
> item names the file and line that proves it is needed.
>
> **Scope rule:** the ask was to change only what should change. Four of the eight FE-facing
> items in the QA and BE reports turned out to need no code at all — they are in §4 with the
> evidence, so nobody re-opens them.

---

## 1. Findings

| ID | What | Why now | Sev | § |
|---|---|---|---|---|
| **FE-01** | "Add lecture" is dead — it posts a zero-duration video and the server now rejects it | Regression *caused by* the BUG-09 guard | **P0** | §2.1 |
| **FE-02** | Certificate screen still assembles itself from four endpoints | D6 root fields shipped; the detour is now pure waste | **P1** | §2.2 |
| **FE-03** | Quiz instructions can't show best score / attempts until an attempt is started | BUG-06 fixed server-side; the fields are in `contentPayload` | **P1** | §2.3 |
| **FE-04** | A failed lecture create shows nothing at all | Found while tracing FE-01; independent of it | **P1** | §2.1 |
| **FE-05** | Lecture editor lets a video be saved with 0 minutes, then shows a generic error | The 422 is new and its field key is unmapped | **P2** | §2.4 |
| **FE-06** | `ADM_CUR_15` has no warning when every lecture in a section shares one duration | The condition that produced BUG-09 is invisible in the UI | **P2** | §2.5 |

---

## 2. The work

### 2.1 FE-01 / FE-04 — "Add lecture" is dead (P0)

`src/components/course-editor/CourseCurriculumScreen.tsx:246-266` creates the placeholder
lecture with:

```ts
lectureType: "video",
durationSecs: 0,
```

`LecturesAdminService.create` now calls `assertVideoDuration(dto)` before it writes
(`src/courses-admin/lectures-admin.service.ts:35-40` in the server repo), so that body returns
**422 `{ errors: { durationSecs: 'requiredForVideo' } }`**.

The call site handles only the success branch:

```ts
if (response.status === HTTP_CODES_ENUM.CREATED) { … }
// no else
```

So the button does nothing, says nothing, and logs nothing. **The admin cannot add a lecture.**

**Fix, two lines.**

1. Give the placeholder a real minimum — `durationSecs: 60` — so the draft satisfies the rule
   the moment it is created. The editor drawer opens on the very next line
   (`store.openLectureDrawer`), with the duration field in front of the admin, so the
   placeholder is never the number that reaches a student unnoticed; §2.5 is the backstop if it
   ever is.
2. Add the missing `else` with `enqueueSnackbar(t("alerts.saveError"), { variant: "error" })`,
   matching `handleSectionSubmit` twelve lines above. A create that fails silently is how this
   one stayed invisible.

> **Alternative, if you would rather not write a placeholder number at all:** default the
> placeholder to `lectureType: "article"`, which carries no duration rule, and let the admin
> pick the type in the drawer that opens immediately. It fabricates nothing. It also changes
> the default type on a video-first platform, which is why it is the alternative and not the
> recommendation. Either way FE-04 is still needed.

**Why the mocked suite is green on a dead button:** every admin spec fulfils the create route
itself (`test/epic-3/course-creation.spec.ts`), so the request body is never validated by
anything. `test/e2e-live/admin-course.spec.ts` runs against the real server and is the suite
that would have caught it.

---

### 2.2 FE-02 — collapse the certificate screen onto D6 (P1)

`src/app/[language]/(student)/certificates/[enrollmentId]/page-content.tsx` currently needs
**four** requests to draw one screen, and two of them are sequential:

| Call | For | Now supplied by |
|---|---|---|
| `GET /enrollments/:id/certificate` | the card | — |
| `GET /students/me/courses` | `enrollment.course.slug`, `progressPct`, `lastLectureId` | `course.slug`, `progressPct`, `lastLectureId` at the root |
| `GET /courses/:slug` (overview) | `course.id` for the questions, `groupIds[0]` for the pathway | `course.id`, `pathway.groupId` |
| `GET /master-data/codes?groupKey=course_group` | the group's display name | `pathway.name`, already localized by the Epic 6 chain |

`GET /career-reflection-questions/grouped?courseId=` cannot fire until the second and third
have both returned — so the reflection form is three round-trips deep on a screen whose whole
point is to feel like an arrival.

**Change.**

- `src/services/api/types/certificate.ts` — `CertificateResponse` gains `course`,
  `progressPct`, `lastLectureId`, `pathway`. The server DTO is
  `CertificateResponseDto` in `src/learning/dto/completion.dto.ts`; mirror it, including that
  every root field is present on **both** branches and only `certificate` goes null.
- `page-content.tsx` — delete `useMyCoursesQuery`, `useCourseOverviewQuery`,
  `usePublicMasterDataCodesService`, the `useMasterDataStore` effect, the `localizedName`
  lookup and the `groupId`/`groupName` `useMemo`. Read all six values off `certificateQuery.data`.
- `NextStepCard` and `CourseNotCompleteState` need **no change** — their props already are
  `groupId`/`groupName` and `progressPct`/`onContinue`. This is a wiring change, not a
  component change.

**What it buys:** four requests become one, the questions call moves into the first wave, and
the `ready: false` branch stops depending on `students/me/courses` — which is the branch that
needs `progressPct` and `lastLectureId` most and was getting them from the least reliable
place.

**Two behaviour notes, both improvements:**

- The pathway is now the server's choice (lowest `displayOrder`, tie broken by name) instead of
  `groupIds[0]`, which was array order — i.e. arbitrary.
- `certificate.courseTitle` is the frozen snapshot and `course.title` is live. Keep printing
  the snapshot on the card; use `course.title` only in the surrounding chrome. The DTO says so
  in its own description and it is the one place they can legitimately differ.

---

### 2.3 FE-03 — bind the quiz stats that no longer cost an attempt (P1)

`src/components/player/quiz/QuizLecture.tsx:74-79` states the old constraint exactly:

> `bestScore` and `previousAttempts` only ship in the start-attempt response (§4.6), and
> starting creates a fresh attempt row

That is fixed. `LectureContentService` now returns both in the quiz `contentPayload`
(`src/learning/services/lecture-content.service.ts:97-99`), read-only — verified on the
container with the `quiz_attempt` count unchanged across reads.

**Change.**

- `src/services/api/types/player.ts:32-43` — `QuizPayload` gains
  `previousAttempts?: number | null` and `bestScore?: number | null`.
- `QuizLecture.tsx:239-251` — prefer the payload, fall back to the live attempt:

```ts
const previousAttempts = payload.previousAttempts ?? lastAttempt?.previousAttempts ?? 0;
const bestScore = payload.bestScore ?? lastAttempt?.bestScore ?? null;
```

  The fallback is not defensive padding: after a submit, `store.attempt` is fresher than the
  cached lecture payload, so the panel should keep preferring it there.
- Replace the comment at lines 74-79. Left as-is it documents a constraint that no longer
  exists, which is worse than no comment.

Nothing else in the quiz flow changes. `passThresholdPercent` is already read in preference to
`passingScore` (`QuizLecture.tsx:227-233`), which was the other half of the §4.3 trap.

---

### 2.4 FE-05 — make the duration rule visible before the request (P2)

`src/components/course-editor/LectureEditorDialog.tsx:155-175` validates `youtubeUrl`,
`articleBody` and `fileUrl` per type, but never `durationMinutes`. A video saved at 0 minutes
now returns 422 and lands on the generic `alerts.saveError` snackbar at line 244 — no field
highlight, no explanation.

**Change.** Add one clause to `validateContent`:

```ts
if (values.lectureType === "video" && !(Number(values.durationMinutes) > 0)) {
  setError("durationMinutes", { message: t("lecture.durationRequiredForVideo") });
  valid = false;
}
```

and, in the `metadataResponse` failure branch, map
`UNPROCESSABLE_ENTITY → errors.durationSecs` onto the same field instead of the generic
snackbar, so a rule the server tightens later still reaches the right input. Add the string to
`en` and `vi` of `admin-panel-courses-editor.json`.

Mirrors the server rule exactly: only `lectureType === 'video'`, only `> 0`. A
wrong-but-positive duration is out of scope on both sides until `YOUTUBE_API_KEY` is decided.

---

### 2.5 FE-06 — the `ADM_CUR_15` uniform-duration warning (P2)

Pure render-time heuristic on data already in the store — no API change. In
`CourseCurriculumScreen.tsx`, per section: when `lectures.length > 1` and every
`durationSecs` is identical and `> 0`, show an inline caution near the section header
(`var(--admin-warning-soft)` is already in use at line 913).

This is the only thing that would have made BUG-09 visible: all 22 MIT lectures read
`1:15:00` and the screen showed it as a fact. It is a warning, never a block — a section of
five identical 3-minute drills is legitimate.

---

## 3. Tests to update

| File | Change |
|---|---|
| `test/epic-4/certificate.spec.ts:117-118` | The mock returns `{ ready, certificate }` only. Add the root fields to both branches, then **delete** the now-dead `students/me/courses`, course-overview and `master-data/codes` route mocks. Add an assertion that no overview request is made — that is what locks §2.2 in. |
| `test/epic-4/course-player.spec.ts:260` | Add `previousAttempts` / `bestScore` to the quiz `contentPayload` and assert both stats render on the instructions screen **before** any attempt is started. |
| `test/epic-3/course-creation.spec.ts` | Assert the add-lecture request body carries a positive `durationSecs`, and add a case where the create route returns 422 and the error snackbar must appear. Without the first, this suite stays green on a dead button. |
| `test/e2e-live/student-journey.spec.ts` | Worth one addition: re-open a completed lecture, then assert the certificate number and completion date are unchanged. That is the P0, checked from the outside. |

---

## 4. Deliberately not changing

Each of these was checked and needs no work. Recorded so they are not re-opened.

| Item | Why not |
|---|---|
| The `in_progress` ping guard, `…/learn/[lectureId]/page-content.tsx:160-176` | Still correct and still worth keeping — it saves a pointless request per lecture open. The server no longer *depends* on it (D7), which was the point: the guard is now an optimization rather than the only thing standing between a student and a revoked certificate. Keep the code; the comment's last clause ("which the server accepts, regressing the record") is now false and should be trimmed. |
| `200` vs `201` on progress (BUG-08 / D10) | `applyResult` already accepts `OK`. No change; the defect was that the spec never said which, and now it does. |
| Career reflection question types (D1/D2) | `CareerReflectionForm.tsx` already renders slider, radio and select, already sends `option.value` rather than the index, and already treats `labelMin`/`labelMax` as slider-only. Matches the server projection exactly. |
| `reviewText`, `/grouped`, `pathway` via `groupId` | All three traps are already avoided, with the reasoning written into the service and component files. |
| Public verification page | `certificate-verify/:number`, unauthenticated, rate-limit branch handled, unknown and malformed numbers treated identically. Matches `CertificateVerificationController`. |
| Admin UI for `DELETE /admin/enrollments/:id/progress` | New surface, not a fix — there is no admin enrollments screen at all today. Usable from `/docs` meanwhile. Spec it separately if you want it. |
| Server-rendered certificate PDF, certificate QR, mobile sidebar drawer, keyboard shortcuts, PDF search, `ADM_CRQ_20` | Tracked in `epic_4_1.md` and v2.3 §6. Not part of this pass. |

---

## 5. Suggested order

1. **§2.1** — an admin cannot currently add a lecture. Everything else is an improvement; this
   is an outage.
2. **§2.3** — smallest change with a visible result, and it retires a stale comment that
   otherwise teaches the next reader something untrue.
3. **§2.2** — the largest diff, and the one that deletes the most code.
4. **§2.4**, then **§2.5**.

## 6. Acceptance

- Add lecture succeeds from a clean course; a forced 422 shows an error rather than nothing.
- The certificate screen issues exactly one certificate request and no course-overview request,
  on both the `ready: true` and `ready: false` branches.
- Best score and attempt count are visible on the quiz instructions screen with zero rows in
  `quiz_attempt` for that enrollment.
- A video lecture cannot be saved at 0 minutes, and the message lands on the field.
- A section whose lectures all share one duration is flagged; a section with one lecture is not.
- `tsc --noEmit` and the Playwright suite are clean, including the four updated spec files.

*End of the Epic 4.2 FE plan.*
