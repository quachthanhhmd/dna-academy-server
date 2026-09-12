# Epic 4.2 — Course Journey Fixes & Data Hygiene

> **This is not a new epic.** It is the corrective pass on the Epic 4 journey, found by running
> that journey for the first time against real data. It lives beside the specs it corrects
> ([`epic_4_course_journey_v2.md`](./epic_4_course_journey_v2.md) and
> [`epic_4_1.md`](./epic_4_1.md)) rather than in a separate epic, because every fix here is a
> change to those contracts — splitting them apart is how the two halves drift.
>
> **Goal:** close the defects found by the first end-to-end run of the learning journey against
> real data, and remove the conditions that let them ship green. One of them silently revokes a
> student's certificate.
>
> **Source:** QA live run, 06/09/2026 — MIT 18.642, 4 sections / 22 lectures, sequential
> completion on, certificate `DNA-2026-000118`, against `localhost:3001` + `localhost:3000`.
> 177 mock tests were green at the time and caught none of it.
>
> **Amends:** v2.3 §4.3 and §4.5, Epic 4.1 §3.2. The amendments are written out in §5 and must
> be folded back into those files — this document is the reasoning, they stay the contract.
> **Impacted personas:** Student (P0), Admin, QA.
> **Server-side scope.** FE-only findings from the report (admin edit form, sidebar tick,
> print CSS — all three already fixed) are cross-referenced in §6 but not specced here.

---

## 1. Findings and priority

| ID | Finding | Side | Sev | § | Status |
|---|---|---|---|---|---|
| **BUG-01** | Re-opening a finished lecture demotes it, and the certificate disappears | BE (+FE, fixed) | **P0** | §2 | ✅ **Fixed** |
| **BUG-02** | `enrollment.completedAt` is overwritten on a demote → re-complete cycle | BE | **P0** | §2.3 | ✅ **Fixed** |
| **BUG-03** | A demoted `lecture_progress` row keeps `completedAt` while reading `in_progress` | BE | **P1** | §2.3 | ✅ **Fixed** |
| **BUG-04** | Master data is 99% test junk — 585 `course_level`, 304 `course_category` | BE / data | **P1** | §4.1 | ⚠️ **Partly** — cause fixed, cleanup awaiting your `--apply` |
| **BUG-05** | One instructor in the whole system, and it is a generated test row | BE / data | **P2** | §4.2 | ✅ **Fixed** |
| **BUG-06** | Quiz instructions screen cannot show `bestScore` / `previousAttempts` without starting an attempt | BE | **P1** | §3.1 | ✅ **Fixed** |
| **BUG-07** | No way to reset a student's progress — every learning scenario runs exactly once | BE | **P2** | §3.2 | ✅ **Fixed** |
| **BUG-08** | `POST /lectures/:id/progress` returns `200` where sibling creates return `201` | BE / docs | **P3** | §3.3 | ✅ **Documented** |
| **BUG-09** | Every lecture in the MIT course shows the same duration | Product | **P2** | §3.4 | ⚠️ **Partly** — BE guard shipped, FE warning + V1.1 API key open |

## 1a. Implementation status — 06/09/2026

**Verified against the running stack, not asserted.** 815 unit tests / 73
suites and 229 e2e tests / 21 suites, all green; the P0 was reproduced in its
original form and re-run after the fix.

### Done and verified

| What | Where | Evidence |
|---|---|---|
| Monotonic lecture status | `progress.service.ts` | 9 unit tests; a demotion is a no-op on status and still writes `watchDurationSecs` |
| Completion never withdrawn | `completion-detector.service.ts` | 7 unit tests incl. the required-lecture-added case |
| `completedAt` stamped once | `completion-detector.service.ts` | Test on `!enrollment.completedAt` replacing `!wasCompleted` |
| `ready` keys on the certificate | `completion.service.ts` | 4 unit tests + e2e |
| Data repair | migration `1786900000000` | Ran on the dev DB; all three corruption queries now return `0` |
| Quiz metadata without an attempt | `lecture-content.service.ts` | 8 unit tests + live check: attempt rows unchanged before/after the read |
| Progress reset endpoint | `enrollment-reset.service.ts`, `learning-admin.controller.ts` | 7 unit + 3 e2e; live run cleared 5 progress / 13 attempts / 8 answers and **kept the certificate** |
| Video duration guard | `lectures-admin.service.ts` | 9 unit tests incl. the merged-patch case |
| Isolated test stack | `docker-compose.test.yaml`, `env/.env.test` | Test DB shows **3** `course_level` codes vs **605** on dev |
| Instructor seed | `instructor-seed.service.ts` | 3 placeholder instructors present on a fresh test DB |
| Spec amendments D7–D10 | v2.3 §4.3/§4.5, 4.1 §3.2 | Folded back, per this folder's own rule |

### The P0, reproduced and re-run

```
1. before:  ready=true | pct=100 | DNA-2026-000121 | completedAt=2026-09-06T10:09:53.724Z
2. POST /lectures/<last>/progress {"status":"in_progress"} → 200
3. after:   ready=true | pct=100 | DNA-2026-000121 | completedAt=2026-09-06T10:09:53.724Z
4. last lecture still reachable → 200
```

Same number, same date, same percentage, still unlocked.

### Needs a decision from you

1. **Run the master-data cleanup.** `npm run clean:master-data` prints the plan
   and changes nothing. On the dev database that plan is **413 delete, 671
   deactivate, 14 keep** — 14 real codes out of 1098. Re-run with `--apply`
   when you are ready; I did not, because the deletes are not reversible and it
   is your working database.
2. **`YOUTUBE_API_KEY`** (§3.4 V1.1 and the playlist import in §6). The BE now
   rejects a zero-duration video lecture, but a wrong-but-positive duration
   still gets through, and nothing can derive the real one without this key.
   One decision unblocks both items.
3. **`FILE_DRIVER` for the QA environment** (§6). The quiz answer-file upload
   has never run end to end because the presigned drivers return `501`.

### Left for the FE

Specced in full, against the client working tree, in
[`epic_4_2_fe_plan.md`](./epic_4_2_fe_plan.md) — including two items this table missed and
the six that were checked and need no change at all.

| Item | Why it is not a BE change |
|---|---|
| **"Add lecture" posts a zero-duration video and now gets 422** | A regression this pass *caused*: the §3.4 guard is right, the client's placeholder body is not. P0 on the client — see the FE plan §2.1 |
| Certificate screen still calls four endpoints | D6 put `course`, `progressPct`, `lastLectureId` and `pathway` at the response root; the client has not adopted them yet (FE plan §2.2) |
| `ADM_CUR_15` warning when every lecture in a section shares one duration | A render-time heuristic on data the API already returns (§3.4) |
| Quiz instructions screen reading `previousAttempts` / `bestScore` | The fields now ship in `contentPayload`; the screen has to bind them (§3.1 / D9) |
| Not sending `in_progress` on re-opening a finished lecture | Already fixed on your side. The server no longer depends on it — that was the point of D7 |
| `ADM_CRQ_20`, mobile sidebar drawer, keyboard shortcuts, PDF search, certificate QR | Tracked in 4.1 and v2.3 §6 |

### Not done, deliberately

- **`test:live` in CI (§7).** The isolated stack it needs now exists
  (`npm run test:e2e:ci` brings it up, runs, tears it down). Wiring it into
  your pipeline is a CI-config change I cannot make from here.
- **Bulk playlist import (§6).** Needs the `YOUTUBE_API_KEY` decision first,
  and its own epic.
- **Server-side certificate PDF.** Still 4.1 D4 / V1.1.

---

BUG-02 and BUG-03 were **not** in the QA report. They were found while verifying BUG-01 and
share its root cause, so they are fixed in the same change.

---

## 2. P0 — the progress state machine is not monotonic

### 2.1 What happens

The player posts `{ status: 'in_progress' }` whenever a lecture is opened. The server accepts
it over an existing `completed`, and the cascade runs to the end:

```
1. start            enrollment: completed   · ready: true    · DNA-2026-000118
2. POST /lectures/<last>/progress { status: "in_progress" }  → 200
                    enrollment: in_progress · ready: false   · number gone
                    progressPct: 100 → 95
3. POST … { status: "completed" }
                    enrollment: completed   · ready: true    · DNA-2026-000118
```

On a sequential course every later lecture locks again at step 2, so the student is both
un-certified and shut out of the material they finished.

### 2.2 Root cause

`ProgressService.record()` writes the requested status straight onto the existing row
([progress.service.ts:66-70](../../../src/learning/services/progress.service.ts:66)):

```ts
await this.lectureProgressesService.update(existing.id, {
  status: input.status,          // ← no comparison with existing.status
  completedAt,
  …
});
```

`CompletionDetectorService.recompute()` then counts rows whose status is `completed`
([completion-detector.service.ts:54-58](../../../src/learning/services/completion-detector.service.ts:54)),
so `progressPct` drops, and the enrollment status is recomputed from scratch
([:67-75](../../../src/learning/services/completion-detector.service.ts:67)) — including
downwards, out of `completed`. `CompletionService.getCertificate` gates the whole response on
`enrollment.status !== 'completed'`, so the certificate stops being returned.

**The certificate row itself is never deleted** — step 3 recovers the same number. The student
loses *access* to it, not the record. That distinction is what §2.4 builds on.

### 2.3 The two further defects in the same path

- **BUG-02 — the completion date moves.** `recompute` stamps `completedAt = new Date()`
  whenever `isCompleted && !wasCompleted`. After a demotion `wasCompleted` is `false`, so
  re-completing writes a **new** date. The certificate's `completionDate` snapshot does not
  move (`issueFor` returns the existing row), so the enrollment and the certificate now
  disagree about when the course was finished — and the certificate is the one shown to the
  student and to the public verify page.
- **BUG-03 — a contradictory row.** `record` deliberately preserves `completedAt` on the
  lecture-progress row, so a demoted row reads `status: 'in_progress'` **with** `completedAt`
  set. Nothing consumes that pair today, which is exactly why it went unnoticed.

### 2.4 The fix

Four changes, all server-side. The FE has already stopped sending the stray ping, but that
closes one client; a retry, a stale tab, or a future mobile app reopens it. This is a data
constraint and belongs on the server.

**(a) Lecture progress status is monotonic.** In `ProgressService.record`:

```ts
const RANK = { not_started: 0, in_progress: 1, completed: 2 } as const;

const status =
  RANK[input.status] > RANK[existing.status] ? input.status : existing.status;
```

A downward write is a **no-op on status**, not an error — it still updates
`watchDurationSecs` and still returns `200` with the current `progressPct`. Rationale: v2.3
§4.5 already promises re-posting `completed` is idempotent; making the mirror case a `409`
would break a legitimate client that simply reopens a lecture.

**(b) Enrollment status never leaves `completed`.** In `CompletionDetectorService.recompute`,
after computing `enrollmentStatus`:

```ts
// Once earned, completion is not taken back. progressPct may still fall — an
// admin adding a lecture to a published course legitimately drops it — but the
// status, the completedAt and the certificate stand.
const finalStatus = wasCompleted ? 'completed' : enrollmentStatus;
```

This also covers the case the QA run did not hit: an admin adding a required lecture to a
course students have already finished.

**(c) `completedAt` is stamped once, ever.**

```ts
if (isCompleted && !enrollment.completedAt) {
  payload.completedAt = new Date();
}
```

Replaces the `!wasCompleted` test, which was only correct while the status could not go
backwards.

**(d) Certificate visibility keys on the certificate, not the enrollment.** In
`CompletionService.buildResponse`, `ready` becomes "a certificate exists for this enrollment,
or the enrollment is complete". An issued certificate is **never** withdrawn — see §5, D7.

### 2.5 Data repair

Existing rows are already corrupted on the dev database. One forward-only migration,
`1786900000000-RepairProgressMonotonicity`:

```sql
-- A lecture that recorded a completion date but reads unfinished (BUG-03).
UPDATE "lecture_progress"
   SET "status" = 'completed'
 WHERE "completedAt" IS NOT NULL AND "status" <> 'completed';

-- An enrollment holding a certificate but demoted out of completed (BUG-01).
UPDATE "enrollment" e
   SET "status" = 'completed'
  FROM "certificate" c
 WHERE c."enrollmentId" = e."id" AND e."status" <> 'completed';

-- Realign the completion date with the certificate the student actually holds (BUG-02).
UPDATE "enrollment" e
   SET "completedAt" = c."completionDate"
  FROM "certificate" c
 WHERE c."enrollmentId" = e."id"
   AND (e."completedAt" IS NULL OR e."completedAt" <> c."completionDate");
```

`progressPct` is not repaired by SQL — it is recomputed correctly on the next progress write,
and a wrong percentage on a completed enrollment is cosmetic once (b) holds.

### 2.6 Tests that would have caught it

Unit, on `ProgressService`: completed → `in_progress` leaves the status at `completed` and the
returned `progressPct` unchanged. On `CompletionDetectorService`: a completed enrollment whose
required-lecture count grows keeps `status: 'completed'` and its original `completedAt`.

Live (`test:live`), the one that actually matters: complete a course, reopen the last lecture,
assert `ready: true` and the **same certificate number**, then assert every lecture is still
unlocked.

---

## 3. P1 / P2 server work

### 3.1 BUG-06 — surface `bestScore` and `previousAttempts` without creating an attempt

v2.3 §5.6 wants the quiz instructions screen to show the best score and the attempt count.
v2.3 §4.6 returns both, but only from `POST /lectures/:id/quiz-attempts` — **and every call
creates a new attempt row**. The two sections contradict each other; the screen cannot be built
as specced.

**Fix:** add both to the quiz branch of `contentPayload` on the existing read-only
`GET /courses/:slug/lectures/:lectureId`:

```jsonc
"contentPayload": {
  "instructions": "…", "passThresholdPercent": 70, "passingScore": 50,
  "allowResume": true, "timeLimitSecs": null, "questionCount": 12,
  "previousAttempts": 2,        // NEW
  "bestScore": 80               // NEW — null when never submitted
}
```

Reuse the `bestScore()` helper already in
[quiz.service.ts:392](../../../src/learning/services/quiz.service.ts:392); no new query shape, and
the answer key stays out of this payload exactly as it is today. `POST .../quiz-attempts` keeps
returning them too — no breaking change.

### 3.2 BUG-07 — `DELETE /admin/enrollments/:id/progress`

One enrollment per (student, course) is enforced by a unique index, and nothing clears
progress, so every learning scenario is a one-shot: QA has to mint a new account or a new
course for each run.

**Add**, behind `PermissionGuard` + `courses:edit`:

```
DELETE /api/v1/admin/enrollments/:id/progress → 204
```

Deletes `lecture_progress`, `quiz_attempts`, `quiz_attempt_answers`, `quiz_saves`,
`reflection_responses` and `career_reflection_answers` for the enrollment, then resets the
enrollment to `status: 'enrolled'`, `progressPct: 0`, `startedAt: null`, `completedAt: null`,
`lastLecture: null`.

**The certificate is not deleted.** Its number may already be public on a verification page
(Epic 4.1 `STU_CVF_11`), and `CertificateGeneratorService.issueFor` is idempotent per
enrollment, so re-completing the course hands back the same number. Deleting a certificate is a
separate, deliberate action and is out of scope here.

Log every call with the acting admin — this endpoint destroys student work and will be reached
for in production sooner or later.

### 3.3 BUG-08 — pin the status code

`POST /lectures/:id/progress` returns `200`
([learning.controller.ts:110](../../../src/learning/learning.controller.ts:110)). It is an upsert
of a row the client never addresses by id, so `200` is right — the inconsistency is that the
spec never said so and the FE had to accept both.

**No code change.** Add the code to v2.3 §4.5 and to the endpoint's `@ApiOperation`.

### 3.4 BUG-09 — where lecture duration comes from

All 22 MIT lectures show `1:15:00` because the value was typed once by the import script.
YouTube **oEmbed does not return duration** — it gives title, author and thumbnail only
([youtube.service.ts:24](../../../src/youtube/youtube.service.ts:24)) — so there is nowhere to
read it from today.

**V1 (this pass):** duration stays admin-entered. Two guards, both cheap: reject
`durationSecs <= 0` on a `video` lecture, and have `ADM_CUR_15` warn when every lecture in a
section carries an identical non-zero duration, which is the signature of exactly this bug.

**V1.1 (specced, not built):** an optional `YOUTUBE_API_KEY`. When set,
`PATCH /admin/lectures/:id/content` with `lectureType: 'video'` calls
`videos?part=contentDetails&id=<videoId>`, parses the ISO-8601 duration and fills
`durationSecs` when the client left it at `0`. When unset, behaviour is exactly V1 — the key is
additive, never required. This is the same key the playlist import in §6 would need, so decide
it once.

---

## 4. Data hygiene

### 4.1 BUG-04 — master data is unusable

`course_level` holds 585 rows against ~4 real ones; `course_category` 304 against ~6. The rest
are `Kiểu cũ 1788617864051` and friends. Admin dropdowns are unusable, and the import script
picked the first row and got junk.

**Cause:** **no e2e spec has an `afterAll`** — a `grep -c afterAll test/admin/*.ts` returns `0`
for every file — and the suite has been run against the dev database. This is the same
accumulation the Epic 4 and Epic 6 reports both flagged; it has now crossed from untidy into
broken.

**Three parts, in this order:**

1. **Isolate the test database.** `APP_ENV=test` points at its own database, created and
   dropped by the suite. This is the fix; the other two are consequences of not having had it.
2. **Clean up what is already there.** A one-off script, not a migration — it touches data, not
   schema, and must be run deliberately. For each code in `course_level` / `course_category` /
   `course_group` matching the generated-name pattern (`~ '[0-9]{10,}'`), count references from
   `course."levelId"`, `course."categoryId"`, `course_group_assignment."groupId"`,
   `instructor_expertise`, `student_profile."educationStageCodeId"` and
   `student_career_interest`. **Zero references → delete. Any reference → `isActive: false`**,
   which is already the platform's "remove" semantics for codes (Epic 2 §5 — there is no delete
   endpoint by design). Print the plan, require a `--apply` flag.
3. **Teardown in the specs.** Even with a separate database, a spec that creates a code should
   remove it, so a developer running one file locally does not leave residue.

### 4.2 BUG-05 — seed real instructors

The MIT course is credited to `E4 Instructor 1788230375265` because it is the only instructor
row that exists, so the instructor block on the player and the overview reads as a rendering
bug. Add a small seed of real instructor rows (name, headline, bio, expertise, photo) alongside
the existing master-data seeds, upserted the way Epic 6's seeds are so a re-run never orphans
`course_instructor` references.

---

## 5. Spec amendments

> ✅ **Folded back on 06/09/2026.** D7, D8 and D10 are now in
> [`epic_4_course_journey_v2.md`](./epic_4_course_journey_v2.md) §4.5, D9 in its
> §4.3, and D8 plus the reset endpoint in [`epic_4_1.md`](./epic_4_1.md) §3.2 —
> as this folder's README requires. The text below stays as the reasoning.

These are gaps in the specification, not just in the code. The P0 exists because the spec was
silent, so fix the spec in the same pass or it returns.

**D7 — the lecture progress state machine (v2.3 §4.5).** Add:

> `not_started → in_progress → completed`, one way. A request to move a lecture to a *lower*
> status is accepted and ignored: `200`, `progressPct` unchanged, `watchDurationSecs` still
> written. The current text — "completion is idempotent" — only covered re-posting the same
> status and left the demotion path undefined, which is where the P0 came from.

**D8 — an issued certificate is never withdrawn (v2.3 §4.5, Epic 4.1 §3.2).** Add:

> Once a certificate is issued, `GET /enrollments/:id/certificate` returns `ready: true` for
> the life of the enrollment. `enrollments.status` does not leave `completed`, and
> `completedAt` is stamped once. `progressPct` **may** fall below 100 — an admin adding a
> required lecture to a published course is the normal way — and that is displayed as-is
> without affecting the certificate.

This answers the QA report's open question directly: the certificate stays.

**D9 — quiz metadata is readable without starting an attempt (v2.3 §4.3).** `contentPayload`
for a quiz lecture gains `previousAttempts` and `bestScore`, removing the §5.6 / §4.6
contradiction.

**D10 — progress returns `200` (v2.3 §4.5).** Stated, not inferred.

---

## 6. Cross-references — not specced here

Already fixed by FE and listed for completeness: the admin course editor rendering an empty
create form (`loadedCourseId` ref outliving the store it guarded), the sidebar preferring
`active` over `completed`, and `@page` nested inside `@media print` breaking hydration under
Turbopack.

Still open on the FE side, tracked in Epic 4.1 and v2.3 §6: `ADM_CRQ_20`, the mobile sidebar
drawer, keyboard shortcuts, PDF search, the certificate QR code.

**Deferred, needs its own epic:** bulk course import from a YouTube playlist. An admin cannot
add 22 lectures today without 22 manual entries — the MIT course only exists because QA wrote a
script against the API. It needs the same `YOUTUBE_API_KEY` decision as §3.4, so settle that
first.

**Unchanged:** quiz answer-file upload still returns `501` under a presigned driver (v2.3
§4.10). It has never run end to end. Not in this pass, but pick `FILE_DRIVER` for the QA
environment so it can at least be exercised once.

---

## 7. Test strategy — the finding underneath the findings

177 mock tests were green and caught **none of these seven**, including a P0 that destroys a
student's certificate. The mocks were written from the same assumption as the code, so they
agreed with it. A mock suite verifies that the FE talks to a *description* of the API; only a
live run verifies it talks to the API.

**Adopt `test:live` (16 cases, no mocks) into CI**, against the isolated database from §4.1:
admin creates and edits a course → student browses → enrolls → learns → progress → sequential
lock → certificate → public verification. Add the BUG-01 regression from §2.6 to it.

Keep the mock suite — it is fast and it guards render logic. Just stop treating it as evidence
that a contract holds.

**No retries in CI.** The suite was flaky at 5 workers because Next was compiling, not because
the product was broken; the fix was 3 workers (6.1 min → 2.5 min). A retry policy would have
hidden precisely the intermittent class of bug worth seeing.

---

## 8. Acceptance criteria

| Requirement | Verified by |
|---|---|
| Re-opening a completed lecture does not change its status | Unit on `ProgressService` + live regression |
| Re-opening a completed lecture does not change `progressPct`, the enrollment status, or the certificate number | Live regression, asserting `DNA-…` is identical before and after |
| A completed enrollment stays completed when the required-lecture set grows | Unit on `CompletionDetectorService` |
| `completedAt` is stamped once and never moves | Unit; asserted against the certificate snapshot |
| Existing corrupted rows are repaired | Migration `1786900000000`, verified up / down / up |
| The quiz instructions screen shows best score and attempts without creating an attempt | `GET /courses/:slug/lectures/:id` returns both; attempt count unchanged after the call |
| QA can rerun a learning scenario on the same account | `DELETE /admin/enrollments/:id/progress` → re-learn → same certificate number |
| Master data dropdowns contain only real options | Cleanup script run; `course_level` back to single digits |
| The test suite cannot pollute the dev database | `APP_ENV=test` on its own database; suite creates and drops it |
| The live suite runs in CI | Pipeline step, no retries |

---

## 9. Suggested order

1. **§2** — the P0 and its two companions, plus the repair migration. Everything else can wait;
   this cannot.
2. **§4.1** — isolate the test database, then run the cleanup. Doing it in the other order just
   refills the tables.
3. **§3.1** and **§3.2** — both unblock QA and the quiz screen.
4. **§5** — the spec amendments, in the same PR as §2 while the reasoning is fresh.
5. **§7** — `test:live` in CI, which is what stops the next one of these reaching a live run.
6. **§4.2**, **§3.3**, **§3.4** — cosmetic and documentation.

---

*End of Epic 4.2.*
