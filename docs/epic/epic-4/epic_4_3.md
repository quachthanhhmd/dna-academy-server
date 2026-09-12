# Epic 4.3 — Curriculum Access & Completion State

> **Delta refinement** for the curriculum block shared by `STU_OVR_04` (v2 §5.2) and the Course
> Player sidebar (v2 §5.4–§5.7). It formalizes three access rules the contract states only
> partially — and fixes the screen that currently ignores the contract altogether.
>
> **Amends:** v2 §2.2 (guest lock rule) and §5.2 (overview curriculum). Fold the rules below
> back into v2 when they land, per this folder's rule.
> **Impacted personas:** Student (enrolled and guest), Admin (indirectly — sequential courses).
> **Verified against the server and client working trees on 07/09/2026.** Every claim names the
> file and line that proves it.

**This file is the requirement.** The work is split three ways:

| Document | For | Contains |
|---|---|---|
| [`epic_4_3_api.md`](./epic_4_3_api.md) | both sides | The contract: endpoints, field semantics, the field-level matrix, error shapes, integration rules. **Read this first** — the other two are written against it. |
| [`epic_4_3_be.md`](./epic_4_3_be.md) | server | BE-1…BE-3 with file:line, the test matrix, and what was proposed and dropped. ~½ day. |
| [`epic_4_3_fe.md`](./epic_4_3_fe.md) | client | FE-1…FE-5 with file:line, component bindings, tests. ~2½ days. |

---

## 0. What is actually broken today

The requirement was first written as if the defect were the server's guest rule. It is not — or
rather, that is the smaller half. **The overview curriculum ignores every access and progress
field the API already sends.**

`src/components/course-overview/CurriculumAccordion.tsx:162-172` (client repo):

```ts
const isOpenable = lecture.isPreview || isEnrolled;
…
onClick={lecture.isPreview ? () => onPreview(lecture.id) : undefined}
…
{lecture.isPreview ? <PlayCircleOutlineRounded/> : <LockOutlined/>}
```

Three consequences, all live:

1. **An enrolled student sees a padlock on every non-preview lecture** — the icon keys on
   `isPreview` alone, never on `isLocked`. On a non-sequential course, which is every course
   today, the whole curriculum reads as locked to the person who enrolled to unlock it.
2. **Clicking does nothing.** `onClick` is bound only for preview rows. An enrolled row gets
   `component="button"` and a pointer cursor and then swallows the click. It looks interactive,
   is styled as interactive, and is inert.
3. **No completion state at all.** The component never reads `progressStatus`. No ticks, no
   counter, no resume chip — on either the row or the section header.

None of this is a missing API. `CurriculumLecture` in `src/services/api/types/catalog.ts:47-63`
already declares `progressStatus`, `isLocked`, `lockReason` and `watchDurationSecs`, with a
comment explaining that reload keeps its ticks. The contract was understood and then not wired
up. **The server fix alone would change nothing a user can see** — which is why the two halves
ship together.

---

## 1. The three rules

### R1 — An enrolled student's curriculum is open

Once an enrollment is active (`enrolled` / `in_progress` / `completed`), every lecture row is
open and navigable, unless the course sets `requiresSequentialCompletion`.

- Applies to the overview accordion and the player sidebar, from the same server fields.
- **Exception (sequential):** lecture N is locked until the nearest *required* predecessor
  reads `completed`, and the lock names that predecessor so the student has somewhere to go.
- `requiresCompletion = false` lectures never block what follows them — already the server's
  behaviour (`sequential-lock.service.ts:47-51`), stated here so the UI does not invent its own.
- **Revisiting a completed lecture is always allowed.** Completion is a state marker, never an
  access restriction. This is load-bearing: Epic 4.2 D7 made re-opening a finished lecture free
  on the server, and a UI that locks it would put the restriction back on the other side.

### R2 — Completion is visible and survives reload

- **Source of truth is the server.** `GET /courses/:slug` returns
  `curriculum[].lectures[].progressStatus`; the row renders from that field.
- `completed` → check tick. `in_progress` → partial chip. `not_started` → nothing.
  `null` → the caller is not enrolled (R3); it is *not* the same as `not_started`.
- Section header carries a live counter — `3 / 8` — summed from `progressStatus`, and hidden
  entirely for a caller who has no progress to count.
- `watchDurationSecs > 0` on a video renders a Resume affordance.
- **The player's optimistic layer stays.** `CurriculumSidebar.tsx:117-118` unions a
  session-completed set over the server status. That union is additive only: it can add a tick
  the server has not caught up on, never remove one. Marking a lecture complete must feel
  instant, and this is what makes it so. "Server only" applies to the *overview*, which has no
  such write and no reason for local state.

### R3 — A non-enrolled visitor sees only previews

Anonymous, or authenticated but not enrolled — and a `cancelled` enrollment counts as not
enrolled:

- **Overview:** preview rows open `<PreviewLectureModal />`, which never writes progress. Every
  other row shows a lock and an "Enroll to unlock" tooltip. This half already works.
- **Player:** a guest cannot browse there — the player has no preview mode and is not getting
  one (§4). The only way in is a pasted URL, handled as a graceful 403 with an enroll CTA.

---

## 2. Behaviour matrix

What the student sees. The field-level version — `isLocked`, `lockReason`, `requiredLectureId`
per caller — is [`epic_4_3_api.md`](./epic_4_3_api.md) §2.2, and it is the one to implement
against.

| Caller | Overview | Player |
|---|---|---|
| Guest / not enrolled | preview rows → modal; every other row locked with "Enroll to unlock" | unreachable by navigation; direct URL → enroll prompt |
| Enrolled, non-sequential | **every row open, no lock icon anywhere**, ticks on what is done | every lecture navigable |
| Enrolled, sequential, predecessor incomplete | lock + tooltip naming the blocker | row disabled; direct nav → 403 → open the blocker |
| Enrolled, sequential, predecessor complete | open | open |
| Lecture with `requiresCompletion = false` | open, excluded from the blocking chain | navigable, completion optional |
| Completed lecture | open, ticked | open, replayable |

The server already produces this correctly for every enrolled caller. Only the guest row and
the client are wrong.

---

## 3. Acceptance criteria

| # | Requirement | Verified by |
|---|---|---|
| AC-1 | Enrolled, non-sequential: no lock icon renders anywhere, and every row navigates | FE spec — zero `lecture-locked-icon`, click opens the player |
| AC-2 | Sequential: lecture N locked until N−1 completed, in overview and sidebar, with the blocker named | BE matrix spec + FE spec |
| AC-3 | A completed lecture is ticked, and the tick survives a hard reload | FE reload test — the assertion that forbids client-side completion state |
| AC-4 | Section counter shows for an enrolled student, is absent for a guest | FE spec |
| AC-5 | Guest: only preview rows are clickable, on sequential and non-sequential courses alike | BE-1 + FE spec |
| AC-6 | Preview playback writes no progress | only `preview-lectures/:id` is called; no `POST /progress` |
| AC-7 | Direct player URL while not enrolled → enroll CTA, not a dead end | FE-3 |
| AC-8 | An enrolled student opening a preview lecture goes to the player, not the modal | gate on enrollment, never on `isPreview` alone |
| AC-9 | A completed lecture is still open and replayable | completion never sets `isLocked` |
| AC-10 | **A guest on a non-sequential course sees locks** | the regression case; wrong on both sides today and checked by neither |

---

## 4. Deliberately not building

### 4.1 Preview mode inside the player

The first draft specced a full preview mode: a route guard, an enroll-prompt card in the
content area, sidebar lock variants, and navigation that skips locked lectures.

A guest has no path into the player. Previews are served by `<PreviewLectureModal />` on the
overview, which is where the enroll decision is being made anyway. The only way to reach the
player unenrolled is to paste a URL — and one branch in the existing `<AccessDeniedState />`
covers it (FE-3).

Building the full version means a second preview surface with its own navigation semantics,
maintained forever, for a path taken by shared links and nothing else. **If you want it, let
traffic justify it, not symmetry** — the data to revisit this is a count of `NOT_ENROLLED` 403s
on the player route.

### 4.2 Skip-lock navigation

`navigateNext/Prev` skipping locked lectures silently teleports the student past content on a
sequential course. The existing behaviour — 403, then an offer to open the blocking lecture —
is both truthful and one click.

### 4.3 Removing the player's optimistic completion set

See R2. Additive-only, and it is what makes the tick appear the instant a lecture is marked
complete.

### 4.4 `NOT_ENROLLED` as a `lockReason` on the player payload

Structurally impossible — the endpoint 403s before the body exists. Detail in
[`epic_4_3_be.md`](./epic_4_3_be.md).

---

## 5. Build order

| Phase | Work | Size |
|---|---|---|
| 1 | [`epic_4_3_be.md`](./epic_4_3_be.md) BE-1…BE-3 | ~½ day |
| 2 | [`epic_4_3_fe.md`](./epic_4_3_fe.md) FE-1 — the overview curriculum | ~1½–2 days |
| 3 | FE-2, FE-3 — player locks and the enroll CTA | ~½ day |
| 4 | FE-4, FE-5 — identity-keyed cache, resume target | ~½ day |
| 5 | AC-1…AC-10 against three fixtures: a guest session, an enrolled non-sequential course, an enrolled sequential course mid-way | ~½ day |

Phase 1 first: FE-1 deletes the client's local rule and starts trusting `isLocked` and
`requiredLectureId`, so those must be right before it does. Total ~3 days.

Epics 5 and 6 are orthogonal. Epic 4.2's FE plan touches the *admin* curriculum screen, not this
one; they do not conflict.

---

## 6. Open questions

1. **Enrolled + sequential + locked row: tooltip, or let the click through?** The matrix
   suppresses navigation on the overview. The alternative lets the player's 403 explain — fewer
   client states, one more round trip. **Recommend suppressing.**
2. **Guest section counter: hidden, or `0 / 8`?** **Recommend hidden** — `0 / 8` reads as "you
   have completed none", a different and slightly hostile claim to make to someone who has not
   enrolled.
3. **A course with zero preview lectures, viewed by a guest.** After BE-1 every row locks and
   the curriculum becomes a wall of padlocks. Product call, not a technical one — flagged
   because BE-1 makes it visible for the first time. FE-1 carries a placeholder treatment (one
   message instead of per-row tooltips) pending your answer.

*End of Epic 4.3.*
