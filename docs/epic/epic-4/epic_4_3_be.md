# Epic 4.3 — Backend Work

> **Server tasks only.** Rules and rationale: [`epic_4_3.md`](./epic_4_3.md). The shapes this
> work must produce: [`epic_4_3_api.md`](./epic_4_3_api.md). The client half:
> [`epic_4_3_fe.md`](./epic_4_3_fe.md).
>
> **Size: about half a day.** Two changes, both small; the work is the tests. The server is
> already correct for every enrolled caller — the enrolled branch of §2 needs no code at all,
> only a test that pins it, because the client is about to start trusting it.

---

## BE-1 — Fix the guest lock rule (P1)

**File:** [`src/course-catalog/course-overview.service.ts:181`](../../../src/course-catalog/course-overview.service.ts)

```ts
// in lectureProgressView(), the !isEnrolled branch
const isLocked = requiresSequentialCompletion && !lecture.isPreview;   // now
const isLocked = !lecture.isPreview;                                   // wanted
```

A guest on a course without sequential completion is currently told every lecture is unlocked —
including the ones only an enrolled student may open. Sequential completion is an ordering rule
*within* a course; it has nothing to say about someone who has not enrolled. The two conditions
were conflated because, on the only courses anyone tested, both happened to be true.

Nothing renders this today, which is exactly why it survived: the client applies its own
(also wrong) rule and never reads the field. Fixing only one side moves the mask rather than
removing it — hence BE-1 and FE-1 ship together.

**Also update the Swagger description** on `CurriculumLectureDto.isLocked`
([`course-overview.dto.ts:40-44`](../../../src/course-catalog/dto/course-overview.dto.ts)),
which currently states the wrong rule in prose:

> "Guest: true for every non-preview lecture on a sequential course."

A description that encodes the bug is how the next reader re-derives it.

---

## BE-2 — Surface `requiredLectureId` on the curriculum (P1)

**Files:**
[`course-overview.dto.ts`](../../../src/course-catalog/dto/course-overview.dto.ts),
[`course-overview.service.ts:206-217`](../../../src/course-catalog/course-overview.service.ts)

`SequentialLockService.evaluate` already returns `requiredLectureId` alongside `isLocked` and
`lockReason`; `lectureProgressView` destructures the first two and drops the third. Add the
field to `CurriculumLectureDto` and stop discarding it.

```ts
return {
  progressStatus: row?.status ?? 'not_started',
  isLocked: lock.isLocked,
  lockReason: lock.lockReason,
  requiredLectureId: lock.requiredLectureId,   // add
  watchDurationSecs: row?.watchDurationSecs ?? 0,
};
```

`null` on every other branch — guests included, where there is no predecessor to name.

**No new query.** The lock evaluation already walks the ordered lecture list in memory; this is
plumbing a value that is computed and thrown away.

Without it the overview can render "locked" but cannot say what to finish first, so AC-2's
tooltip would have to either omit the blocker or fetch the curriculum a second time to find it.

---

## BE-3 — Pin the matrix with tests (the actual work)

**File:** `src/course-catalog/course-overview.service.spec.ts`

Table-driven over the five rows of [`epic_4_3_api.md`](./epic_4_3_api.md) §2.2. One case per
row, asserting all five fields together — asserting them separately is how a payload ends up
self-contradictory (`isLocked: true` with `lockReason: null`).

Cases that must exist by name:

| Case | Asserts |
|---|---|
| guest, **non-sequential** course | `isLocked === !isPreview` — **the regression this epic exists for**; it would have failed for as long as the code has existed |
| guest, sequential course | same expectation, proving the flag is irrelevant to a guest |
| enrolled, non-sequential | every row `isLocked: false`, `lockReason: null` |
| enrolled, sequential, mid-course | locked rows carry `PREVIOUS_LECTURE_INCOMPLETE` **and** a `requiredLectureId` |
| enrolled, sequential, optional lecture in the chain | a `requiresCompletion: false` lecture neither locks itself nor blocks its successor |
| enrolled, `status: 'cancelled'` | treated as a guest, `progressStatus: null` |
| enrolled, nothing started | `progressStatus: 'not_started'`, **not** `null` — the two are different answers |

Add one e2e in `test/` that hits `GET /courses/:slug` twice, with and without a token, and
asserts the two curricula differ in exactly the documented way. The optional-auth behaviour is
the part most likely to regress silently, because both answers are valid-looking JSON.

**Invariant worth a dedicated assertion:** `lockReason === null` if and only if
`isLocked === false`. It holds across every branch and it is cheap to check everywhere.

---

## Explicitly not changing

| Proposed | Why not |
|---|---|
| Add `NOT_ENROLLED` to `lockReason` on `GET /courses/:slug/lectures/:lectureId` | `loadLecture` throws `403 { code: 'NOT_ENROLLED' }` at [`player.service.ts:88`](../../../src/learning/services/player.service.ts) before any DTO exists; the DTO's `isLocked`/`lockReason` are hardcoded `false`/`null` on the only reachable path. The client already reads the 403 code. |
| `hasPreviewLectures` per section | Derivable from the lectures in the same payload. |
| Anything in `preview-lectures/:id` | Correct as it stands: preview-only, no auth, no writes. |
| The enrolled branch of the lock rule | Already correct — `SequentialLockService` handles optional lectures and walks back to the nearest required predecessor. BE-3 pins it; it does not change. |

---

## Definition of done

> ✅ **Complete, 07/09/2026.** Verified against the isolated test stack; transcripts in
> [`epic_4_3_api.md`](./epic_4_3_api.md) §7.

- [x] Guest `isLocked` is `!isPreview` on both a sequential and a non-sequential course.
- [x] `requiredLectureId` present on every curriculum lecture, non-null exactly when the lock is `PREVIOUS_LECTURE_INCOMPLETE`.
- [x] Swagger description for `isLocked` matches the code — `lockReason` and the new field documented too.
- [x] Matrix spec green, including the guest / non-sequential case (13 unit cases).
- [x] `lockReason === null ⟺ isLocked === false` asserted — on every branch, unit and e2e.
- [x] The §6 curl checks in the API contract return what that file says they will.

**Extra, not asked for but cheap:** `requiredLectureId !== null ⟺ lockReason === 'PREVIOUS_LECTURE_INCOMPLETE'`
is asserted the same way, because the new field has the same failure mode as the pair it joins.

Ships before FE-1. The client is about to delete its local rule and trust these fields; it
should be trusting the fixed ones — **it now is**, and FE-1 is unblocked.

### Suite state after this change

| Suite | Before | After |
|---|---|---|
| Unit | 815 / 73 suites | **819 / 73 suites** |
| E2E | 229 / 21 suites | **241 / 22 suites** |

The unit count rises by only 4 because the matrix spec replaced the older, narrower v2.2 lock
tests rather than sitting beside them — the old ones asserted the guest rule this epic fixes,
so keeping them would have meant keeping the bug in the suite.
