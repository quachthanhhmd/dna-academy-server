# Epic 4.3 — Frontend Work

> **Client tasks only.** Rules and rationale: [`epic_4_3.md`](./epic_4_3.md). The fields this
> work consumes: [`epic_4_3_api.md`](./epic_4_3_api.md). The server half:
> [`epic_4_3_be.md`](./epic_4_3_be.md).
>
> **Repo:** `dna-academy-client`. Every path below is relative to that repo's root, verified
> against its working tree on 07/09/2026.
>
> **Size: about 2½ days**, nearly all of it FE-1. This is where the epic actually lives — the
> server is two small changes, the client is the screen.

---

## FE-1 — Render the overview curriculum from the server (P0, ~1½–2 days)

**File:** `src/components/course-overview/CurriculumAccordion.tsx`

The component derives everything from `isPreview` and an `isEnrolled` prop, and reads none of
the four access/progress fields the API sends. Lines 162-172:

```ts
const isOpenable = lecture.isPreview || isEnrolled;
onClick={lecture.isPreview ? () => onPreview(lecture.id) : undefined}
{lecture.isPreview ? <PlayCircleOutlineRounded/> : <LockOutlined/>}
```

Three live consequences: an **enrolled** student sees a padlock on every non-preview lecture;
clicking an enrolled row does nothing at all (`onClick` is bound only for previews, while
`isOpenable` still styles the row as a button); and no completion state renders anywhere.

`CurriculumLecture` in `src/services/api/types/catalog.ts:47-63` **already declares**
`progressStatus`, `isLocked`, `lockReason` and `watchDurationSecs`, with a comment about ticks
surviving reload. The types are right; the component never reads them. No type work is needed
beyond adding `requiredLectureId` when BE-2 lands.

### What each row element binds to

| Element | Field | Rule |
|---|---|---|
| lock icon | `isLocked` | Never on an unlocked row, whoever is asking. `isPreview` must stop driving this. |
| click behaviour | `isLocked`, `isEnrolled` | unlocked + enrolled → navigate to `/{locale}/courses/{slug}/learn/{id}`; unlocked + guest → `onPreview` modal; locked → no navigation |
| tooltip | `lockReason` | `NOT_ENROLLED` → "Enroll to unlock". `PREVIOUS_LECTURE_INCOMPLETE` → name the blocker, linking `requiredLectureId`. |
| tick / chip | `progressStatus` | `completed` → tick; `in_progress` → partial chip; `not_started` and `null` → nothing |
| resume chip | `watchDurationSecs > 0` | video rows only |
| section counter | sum over `progressStatus` | **hidden entirely when `progressStatus` is `null`** — a guest has nothing to count, and `0 / 8` reads as an accusation |

**The enrolled row must navigate.** Adding the missing `onClick` is what turns this from a
refinement into a bug fix: today the primary way into a course from its own page does not work.

`isEnrolled` stays as a prop, but only to choose *modal versus navigate*. Every other branch
reads a server field — that is what stops the client and server rules from drifting apart
again, which is the whole failure mode this epic is correcting.

### Guard against the empty state

After BE-1, a guest looking at a course with **no preview lectures** sees every row locked. The
component should not render a wall of padlocks with no explanation — if no lecture in the
curriculum is openable for this caller, show one message at the top of the accordion rather
than a tooltip per row. See `epic_4_3.md` §8 question 3; this is the client's half of it.

---

## FE-2 — Locks in the player sidebar (P1, ~2 hours)

**File:** `src/components/player/CurriculumSidebar.tsx`

The sidebar already renders ticks and a per-section counter, but never reads `isLocked` (only
`isPreview`, at line 379). On a sequential course a locked row is visually identical to an open
one, so the student discovers the lock by clicking and receiving a 403.

Render the lock and suppress navigation on `isLocked`. **Keep the 403 handler as the backstop:**
a lock computed at page load goes stale the moment the student completes something in another
tab, and per the API contract the server stays the authority.

**Do not change `isDone` at lines 117-118.** It unions a session-completed set over the server
status; the union only ever *adds* a tick, never removes one, and it is what makes "mark
complete" feel instant. `epic_4_3.md` R2 states this exception deliberately — the "server only"
rule applies to the overview, which has no such write.

---

## FE-3 — Enroll CTA on the `NOT_ENROLLED` 403 (P1, ~1 hour)

**File:** `src/components/player/AccessDeniedState.tsx`

The component maps 403 codes to four different ways out, and `NOT_ENROLLED` falls through to
the generic "back to course". Give it a branch: **[Enroll]** routing to the overview CTA, and
**[Browse previews]** for the nearest preview lecture.

This is the whole of the "preview mode in the player" requirement. A guest has no navigation
path into the player — previews are served by `<PreviewLectureModal />` on the overview, where
the enroll decision is already being made — so the only way to arrive unenrolled is a pasted
URL. One branch in an existing component covers it; a second preview surface with its own
navigation semantics does not earn its maintenance. See `epic_4_3.md` §5.1.

---

## FE-4 — Cache the overview per identity (P2, ~1 hour)

**File:** `src/app/[language]/(student)/queries/queries.ts:39-52`

`useCourseOverviewQuery` keys on `[slug, locale]` — not on who is asking. `GET /courses/:slug`
takes optional auth and returns a *different curriculum* per caller, so the two answers share a
cache entry.

Nothing in the client clears or resets the query cache (`grep` for `clear()` / `resetQueries` /
`removeQueries` across `src` returns nothing), and `refetchOnWindowFocus` is off. Signing in
through the modal does not unmount the overview page, so **a student who signs in from a course
page keeps looking at the guest curriculum** — every lecture locked, after they just
authenticated.

Fix: add the user id to the query key, or invalidate `catalogQueryKeys.all()` on auth change.
Enrolling already invalidates correctly (`page-content.tsx:154`).

Low priority only because FE-1 makes it *visible*: today both cached answers render identically
wrong, so nobody can see it.

---

## FE-5 — "Continue learning" should resume (P2, ~1 hour)

**File:** `src/app/[language]/(student)/courses/[slug]/page-content.tsx:45-58`

`firstOpenableLectureId` returns the first lecture in reading order, under a comment that says:

> The overview projection carries no per-lecture progress

That is **not true** — the projection carries `progressStatus` per lecture, which is what this
epic is about. So "Continue learning" always lands on lecture 1 and the student re-navigates by
hand.

Once FE-1 lands, target the first lecture that is not `completed` and not `isLocked`, falling
back to the first lecture. Fix the comment with it: it is the reason the helper was written
this way, and left in place it will justify writing it this way again.

Listed here rather than in its own epic because it consumes exactly the field this work is
wiring up, and it is a one-function change.

---

## Tests

| File | Change |
|---|---|
| `test/epic-4/course-overview.spec.ts` | Mock the curriculum for all five caller states in `epic_4_3_api.md` §2.2. Assert: enrolled + non-sequential renders **zero** `lecture-locked-icon`; enrolled row click navigates to the player; guest sees locks on a **non-sequential** course (the BE-1 regression, from the client side); ticks come from `progressStatus`; the counter is absent for a guest. |
| `test/epic-4/course-overview.spec.ts` | Reload test for AC-3: the tick must survive a full page load, which is the assertion that forbids re-introducing client-side completion state. |
| `test/epic-4/course-player.spec.ts` | Locked sidebar row is not navigable; a 403 still overrides a stale unlocked payload. |
| `test/epic-4/course-player.spec.ts` | `NOT_ENROLLED` 403 renders the enroll CTA, not the generic wall. |

Every one of these is route-mocked, so they verify the client against the **contract**, not
against a running server. That is the right level here — but it also means they cannot catch a
server that stops honouring the contract. `epic_4_3_be.md` BE-3 is the other half; neither
suite is sufficient alone.

---

## Order

1. **FE-1** — the outage. Everything else is small.
2. **FE-2**, **FE-3** — half a day together.
3. **FE-4**, **FE-5** — cleanups that only become visible once FE-1 is in.

FE-1 needs BE-1 and BE-2 deployed first: it deletes the client's local rule and starts trusting
`isLocked` and `requiredLectureId`, so those need to be right before it does.

---

## Definition of done

- [ ] Enrolled + non-sequential: no lock icon renders, and every row opens the player.
- [ ] Enrolled + sequential: locked rows show a lock and name the blocking lecture.
- [ ] Completed lectures show a tick that survives a hard reload.
- [ ] Section counter shows for an enrolled student, is absent for a guest.
- [ ] Guest: only preview rows clickable, on sequential and non-sequential courses alike.
- [ ] Player: locked rows not navigable; 403 still wins over a stale payload.
- [ ] Direct player URL while not enrolled → enroll CTA.
- [ ] Signing in on a course page updates the curriculum without a manual reload.
- [ ] `tsc --noEmit` clean; the four spec files above green.
