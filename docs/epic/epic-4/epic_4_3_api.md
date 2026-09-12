# Epic 4.3 — API Integration Contract

> **The handshake.** Both sides code against this file: the server makes it true, the client
> assumes nothing else. Rules and rationale live in [`epic_4_3.md`](./epic_4_3.md); tasks live
> in [`epic_4_3_be.md`](./epic_4_3_be.md) and [`epic_4_3_fe.md`](./epic_4_3_fe.md).
>
> **Status: shipped on the server, 07/09/2026.** Both server changes are live and verified —
> `isLocked` now means what §2.2 says for a guest, and `requiredLectureId` is present on every
> curriculum lecture. The §6 commands below were run against a real stack and returned exactly
> what this file predicts; the transcripts are in §7. Everything else here documents what
> already existed — written down because the client is currently ignoring it (see
> `epic_4_3.md` §0).
>
> **The client half has not shipped.** FE-1 still applies its own lock rule, so until it lands
> the fixed field is correct and unread.

---

## 1. Endpoints in play

| Endpoint | Auth | Role in this epic |
|---|---|---|
| `GET /api/v1/courses/:slug` | **Optional** — `AuthGuard(['jwt', 'anonymous'])` | Carries the whole curriculum with per-lecture access and progress. The only source for both screens' lock and tick state. |
| `GET /api/v1/courses/:slug/lectures/:lectureId` | Required (JWT + onboarding) | Enrolled playback. 403s before returning a body when access is refused. |
| `GET /api/v1/courses/:slug/preview-lectures/:lectureId` | None | Preview playback. Never writes `lecture_progress`. Unchanged. |

**Optional auth is the pivot of this epic.** The same URL returns a different curriculum
depending on whether a token was sent — so the client must send the token whenever it has one,
and must not cache the two answers under one key.

---

## 2. `GET /courses/:slug` — the curriculum payload

### 2.1 Per-lecture fields

```jsonc
{
  "id": "uuid",
  "title": "Sequencing pipelines",
  "lectureType": "video",
  "durationSecs": 900,
  "isPreview": false,
  "displayOrder": 3,

  "progressStatus": "completed",          // null | not_started | in_progress | completed
  "isLocked": false,
  "lockReason": null,                      // null | NOT_ENROLLED | PREVIOUS_LECTURE_INCOMPLETE
  "requiredLectureId": null,               // ADDED by this epic — see §2.3 · shipped
  "watchDurationSecs": 412                 // null for a non-enrolled caller
}
```

### 2.2 Field semantics — the whole matrix

| Caller | `progressStatus` | `isLocked` | `lockReason` | `requiredLectureId` | `watchDurationSecs` |
|---|---|---|---|---|---|
| Not enrolled (no token, or token without enrollment) | `null` | `!isPreview` | `NOT_ENROLLED` when locked, else `null` | `null` | `null` |
| Enrolled, course not sequential | real value | `false` | `null` | `null` | number (`0` if unwatched) |
| Enrolled, sequential, nearest required predecessor not `completed` | real value | `true` | `PREVIOUS_LECTURE_INCOMPLETE` | that predecessor's id | number |
| Enrolled, sequential, predecessor `completed` | real value | `false` | `null` | `null` | number |

Three invariants the client may rely on:

- **`isLocked` is the only lock authority.** `isPreview` describes what a *guest* may reach; it
  says nothing about an enrolled caller and must never drive a lock icon.
- **`progressStatus: null` means "not enrolled", not "nothing done".** It is distinct from
  `not_started`, and it is how the client decides to hide a completion counter rather than show
  `0 / 8`.
- **`lockReason` is non-null exactly when `isLocked` is true.** Neither appears without the
  other.

An enrollment with `status: 'cancelled'` counts as not enrolled, everywhere.

### 2.3 What changes

| Field | Before | Now | Who breaks if ignored |
|---|---|---|---|
| `isLocked` (guest) | `requiresSequentialCompletion && !isPreview` | ✅ `!isPreview` | Guests on a non-sequential course are told every lecture is open. |
| `requiredLectureId` | absent | ✅ present, per the matrix | The overview can say "locked" but cannot name the blocker or link to it. |

Both landed in
[`course-overview.service.ts`](../../../src/course-catalog/course-overview.service.ts)
(`lectureProgressView`) and
[`course-overview.dto.ts`](../../../src/course-catalog/dto/course-overview.dto.ts).
`requiredLectureId` cost no new query: `SequentialLockService.evaluate` already computed it
while walking the ordered lecture list, and the value was being discarded one line later.

`lockReason`'s enum already contains both values; no enum change. The `isLocked` Swagger
description used to encode the wrong rule ("Guest: true for every non-preview lecture **on a
sequential course**") and ✅ has been corrected alongside the code — a wrong description is how
the next reader re-derives the bug.

### 2.4 Not being added

`hasPreviewLectures` per section was proposed and dropped: derivable from the same payload with
`section.lectures.some(l => l.isPreview)`. Adding it would ship a field whose only job is to
save the client one line.

---

## 3. `GET /courses/:slug/lectures/:lectureId` — enrolled playback

Unchanged by this epic. Documented because the client's error handling is part of the work.

**Refusals are 403s with a code, not payload flags.** The guard order is: not enrolled →
lecture not found (404) → sequential lock.

```jsonc
// not enrolled, or enrollment cancelled
403 { "status": 403, "code": "NOT_ENROLLED" }

// sequential lock
403 { "status": 403, "code": "PREVIOUS_LECTURE_INCOMPLETE", "requiredLectureId": "uuid" }

// onboarding incomplete (OnboardingGuard, before the controller)
403 { "code": "ONBOARDING_REQUIRED" }
```

`isLocked` and `lockReason` **do exist on the 200 body and are always `false` / `null`**. They
are structurally unreachable as anything else: every refusal throws before the DTO is built.
Do not read them, and do not add `NOT_ENROLLED` to them — that was proposed and dropped for
this reason.

Side effect worth knowing: a successful load writes `lastLecture` and `lastAccessedAt` on the
enrollment. It is the "Continue learning" pointer, and it is why this endpoint must not be
called speculatively for a lecture the student did not choose.

---

## 4. `GET /courses/:slug/preview-lectures/:lectureId` — preview playback

Unchanged. No auth, serves `isPreview: true` lectures only, `403 NOT_A_PREVIEW_LECTURE`
otherwise. Writes nothing: no `lecture_progress` row, no `lastAccessedAt`, no enrollment
transition.

Returns the same `LectureViewDto` with `progressStatus: 'not_started'`, `watchDurationSecs: 0`,
`isLocked: false`, `lockReason: null` — constants, not the caller's state, since there is no
caller identity.

**This is the only content endpoint a non-enrolled caller can reach.** Any preview surface must
call it and never the enrolled one.

---

## 5. Integration rules for the client

1. **Send the token when you have one.** The overview is the same URL for both caller states;
   an authenticated student who gets the anonymous answer sees a locked curriculum.
2. **Key the cache on identity.** The overview response must not be shared between a signed-out
   and a signed-in view of the same slug, and it must be invalidated on enroll — the enroll
   mutation changes every lecture's `isLocked` in one step.
3. **Render locks from `isLocked`, ticks from `progressStatus`, never from `isPreview` or from
   local state** (the player's additive session set is the one documented exception — see
   `epic_4_3.md` R2).
4. **Treat a 403 as authoritative over a stale payload.** A lock computed at page load goes
   stale the moment the student completes something in another tab. The client suppresses
   navigation on `isLocked` as a courtesy; the server decides.
5. **Never call the enrolled lecture endpoint for a non-enrolled caller.** It 403s, and it is
   the wrong endpoint: preview content has its own.

---

## 6. Verification

Both sides should be able to run this and agree, on one sequential and one non-sequential
course:

```bash
# guest
curl -s "$API/api/v1/courses/$SLUG" \
  | jq '[.curriculum[].lectures[] | {isPreview, isLocked, lockReason, progressStatus}]'
# expect: isLocked == !isPreview on BOTH courses; progressStatus all null

# enrolled, non-sequential
curl -s -H "Authorization: Bearer $TOKEN" "$API/api/v1/courses/$SLUG" \
  | jq '[.curriculum[].lectures[] | select(.isLocked)] | length'
# expect: 0

# enrolled, sequential, mid-course
curl -s -H "Authorization: Bearer $TOKEN" "$API/api/v1/courses/$SEQ_SLUG" \
  | jq '[.curriculum[].lectures[] | {isLocked, lockReason, requiredLectureId}]'
# expect: every locked row names a requiredLectureId
```

The first command on a **non-sequential** course is the case that has never been checked and
the one this epic exists to fix.

---

## 7. Verification transcripts — 07/09/2026

Run against the isolated test stack (`docker-compose.test.yaml`, `:3002`) on two courses built
for the purpose: `access-seq-*` with sequential completion on, `access-flat-*` with it off.
Both have lecture 1 as a free preview and lecture 2 not.

**Guest, both courses.** The first line is the case that had never been checked.

```jsonc
// non-sequential
[{"isPreview":true, "isLocked":false,"lockReason":null,         "progressStatus":null},
 {"isPreview":false,"isLocked":true, "lockReason":"NOT_ENROLLED","progressStatus":null}]

// sequential — byte-identical, proving the flag is irrelevant to a guest
[{"isPreview":true, "isLocked":false,"lockReason":null,         "progressStatus":null},
 {"isPreview":false,"isLocked":true, "lockReason":"NOT_ENROLLED","progressStatus":null}]
```

Before the fix the non-sequential row read `isLocked: false` on both lectures.

**Enrolled, non-sequential** — `[.curriculum[].lectures[] | select(.isLocked)] | length` → `0`.

**Enrolled, sequential, mid-course.**

```jsonc
[{"isLocked":false,"lockReason":null,                         "requiredLectureId":null},
 {"isLocked":true, "lockReason":"PREVIOUS_LECTURE_INCOMPLETE","requiredLectureId":"4fc7a08b…"}]
```

Every locked row names its blocker. After completing lecture 1 the second row becomes
`{"isLocked":false,"lockReason":null,"requiredLectureId":null}`.

### What pins this

| Level | Where | Count |
|---|---|---|
| Unit — the §2.2 matrix, one case per row | `course-overview.service.spec.ts` | 13 cases |
| E2E — same URL with and without a token | `test/user/course-overview-access.e2e-spec.ts` | 12 cases |

Both invariants are asserted on every branch rather than in one place:
`lockReason === null ⟺ isLocked === false`, and `requiredLectureId !== null ⟺ lockReason === 'PREVIOUS_LECTURE_INCOMPLETE'`.

*End of the Epic 4.3 API contract.*
