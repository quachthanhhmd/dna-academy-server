# Epic 4.5 — My Learning Dashboard (`STU_MYC_05`)

> **Implementation plan. Written to be executed, not interpreted.** Every field name, path and
> file below is literal and was verified against both working trees on 10/09/2026. Where a
> thing already exists, the plan says so and says *modify*, never *build*.
>
> **Renumbered:** the draft was titled "Epic 4.4", which is Course Search & Catalog
> ([`epic_4_4_catalog.md`](./epic_4_4_catalog.md)). This is **4.5** throughout.
>
> **Source design:** `mylearning-dashboard.html`. **Requirements:** PDF (My Courses / Start
> Learning / Certificate) + Epic 4 v2 §5.3.
>
> **Read order:** §1 is the contract; §2 and §3 are written against it and restate nothing.
>
> **Effort: ~5 days** (draft said 8.5). §0.2 is why.

---

## 0. Locked decisions

### 0.1 Decisions

| # | Decision | Locked |
|---|---|---|
| **D0** | Header scoped search | **Dropped from V1.** The header search box belongs to Epic 4.4: global full-text search routing to `/courses?search=`. No `/students/me/courses/search` endpoint, no results dropdown. With 14 enrollments and three tabs, a second search is a feature for a problem that does not exist yet. |
| **D1** | Final Grade on completed cards | **Revised 10/09/2026 — frozen onto the certificate.** `MAX(score)` across the student's submitted attempts is computed **once, at issue time**, stored on `certificate.finalGradePct`, and never recomputed — see §1.5. No attempts at issue → the column is `NULL` and the grade row is omitted entirely (do not render `0%`). |
| **D2** | Hours Studied | **Σ `durationSecs` of completed lectures ÷ 3600**, rounded to one decimal. Deterministic; not `watchDurationSecs`. |
| **D3** | Tab filtering | **Server-side** via `?status=`, **plus a `counts` object** on every response. Both are required — see §1.2. |
| **D4** | — | Void (was scoped-search scope; see D0). |
| **D5** | Rating/reflection on completed cards | Link to the certificate screen (`STU_CER_10`, `/certificates/:enrollmentId`). No rating UI on the dashboard. |
| **D6** | Share | Copy-link to clipboard. No LinkedIn deep-link in V1. |
| **D7** | Notifications icon | Hidden in V1. No notification schema exists. |
| **D8** | Page size | **6** (featured + 5). |
| **D9** | Lecture duration source | **Admin-entered and mandatory.** No `YOUTUBE_API_KEY`. This is what makes D2 and `remainingDurationSecs` trustworthy — see §0.3. |

### 0.2 Why 5 days and not 8.5

Already built and to be **modified, not created**:

- `GET /students/me/courses` — endpoint, controller, service, DTO
  (`src/course-catalog/student-courses.controller.ts`, `course-enrollment.service.ts:96-130`,
  `dto/my-course.dto.ts`). Returns 13 of the fields the design needs.
- The dashboard screen with All / In Progress / Completed tabs and per-tab counts
  (`src/app/[language]/(student)/students/me/courses/page-content.tsx`, 183 lines).
- `<EnrollmentCard />`, `<EnrollmentStatusBadge />`, the archived treatment, the progress bar,
  the status-driven CTA.
- The certificate modal's entire payload and print stylesheet — the certificate screen
  (`STU_CER_10`) already renders it.

Not built, and not in the draft's estimate: nothing. The draft's own §2.3 and FE-10/FE-12 are
removed by D0.

### 0.3 Prerequisite outside this epic — D9

Three numbers on this screen derive from `lecture.durationSecs`: `remainingDurationSecs`
("2h 15m left"), `totalStudyHours` ("148.5h") and the featured card's time-left line.

`durationSecs` is admin-entered today and **the input already exists** —
`LectureEditorDialog.tsx:87`, `durationMinutes`, on the lecture metadata form. Two things make
it reliable, both already specced in [`epic_4_2_fe_plan.md`](./epic_4_2_fe_plan.md):

1. **§2.1 (FE-01)** — `CourseCurriculumScreen.addLecture` posts `durationSecs: 0` on a `video`
   lecture, which the server now rejects with `422 { errors: { durationSecs: 'requiredForVideo' } }`.
   The Add Lecture button is dead until this is fixed.
2. **§2.4 (FE-05)** — client-side validation so a video cannot be saved at 0 minutes, with the
   422's field key mapped onto the input.

**Both must ship before this dashboard's time figures mean anything.** They are small (two
lines and one clause) and they are the reason D2 is safe to compute from durations. The server
guard is already live (`src/courses-admin/lectures-admin.service.ts:29-42`).

Until then, existing courses carry placeholder durations (Epic 4.2 BUG-09: all 22 MIT lectures
read `1:15:00`). Fixing those rows is data entry, not code.

---

## 1. API integration

### 1.1 Endpoints

| Purpose | Method | Path | State |
|---|---|---|---|
| Dashboard list | `GET` | `/api/v1/students/me/courses?status=&page=&limit=` | **MODIFY** — §1.2, §1.3 |
| Momentum stats | `GET` | `/api/v1/students/me/stats` | **ADD** — §1.4 |
| Certificate modal | `GET` | `/api/v1/enrollments/:id/certificate` | exists, unchanged |
| Verify link | `GET` | `/api/v1/certificate-verify/:number` | exists, public, rate-limited |
| Continue / Start / Review | — | client route `/{locale}/courses/{slug}/learn/{lectureId}` | no API |

**Two path corrections from the draft:**

- Verification is **`/certificate-verify/:number`**, not `/certificates/verify/:number`. It sits
  at the top level deliberately: `/certificates` belongs to the generated CRUD controller whose
  `@Get(':id')` would shadow a `verify` segment
  (`src/learning/certificate-verification.controller.ts:19-26`).
- **`GET /enrollments/:id/certificate/download` does not exist and is not being built.** Epic
  4.1 D4 decided against server-side PDF for V1; `CertificateDto.fileUrl` is documented as
  *"Always null in V1 … the Download button prints the card client-side"*. The modal's Download
  buttons call `window.print()` against the print stylesheet the certificate screen already
  carries. Do not add a download endpoint to satisfy the design's two PDF buttons; render one
  button, labelled Download, that prints.

### 1.2 `GET /students/me/courses` — response envelope

**Breaking change:** the endpoint returns a bare `MyCourseDto[]` today. It now returns an
envelope. `useMyCoursesQuery` and every caller must be updated in the same change.

```jsonc
{
  "data": [ /* MyCourseDto, §1.3 */ ],
  "counts": { "all": 14, "inProgress": 8, "completed": 6 },
  "totalCount": 14,
  "page": 1,
  "limit": 6,
  "hasNextPage": true
}
```

**`counts` is mandatory and always describes the unfiltered set**, regardless of `?status=`.
Without it, server-side filtering (D3) makes the tab counters impossible: a page filtered to
`in_progress` cannot know how many `completed` rows exist. This is the one place the draft
contradicted itself — its AC-2 required all three counts while its D3-A filtered server-side.

`totalCount` describes the **filtered** set and drives pagination. `counts.all` and
`totalCount` are equal only when `status` is absent.

**Query params:**

| Param | Type | Notes |
|---|---|---|
| `status` | `in_progress \| completed` | Absent = all. `cancelled` rows are always included in `all` and never match a tab. |
| `page` | int ≥ 1 | default 1 |
| `limit` | int ≥ 1 | default 6, hard cap 24 |

**Ordering** (single rule, applied after filtering):

1. `in_progress` first, by `lastAccessedAt DESC NULLS LAST`
2. then `enrolled` (never started), by `enrollmentDate DESC`
3. then `completed`, by `completedAt DESC`
4. then `cancelled`, by `enrollmentDate DESC`
5. tiebreak `enrollment.id ASC` — without it pagination can repeat or skip a row

The featured card is simply `data[0]`. The client does not re-sort.

### 1.3 `MyCourseDto`

Existing fields keep their names, types and meanings. Additions marked **NEW**.

```jsonc
{
  "enrollmentId": "uuid",
  "status": "in_progress",              // enrolled | in_progress | completed | cancelled
  "isArchived": false,                  // course.status !== 'published'
  "enrollmentDate": "2026-01-05T00:00:00.000Z",
  "completedAt": null,
  "lastAccessedAt": "2026-09-08T10:00:00.000Z",
  "progressPct": 68,

  "course": {
    "id": "uuid", "title": "...", "slug": "...", "thumbnailUrl": "...",
    "language": "vi",                              // NEW
    "totalLectures": 20,                           // NEW — course.totalLectures
    "totalDurationSecs": 36000,                    // NEW — course.totalDurationSecs
    "courseGroup": { "id": "uuid", "name": "Data Science" } | null   // NEW
  },

  "courseThumbnailUrl": "...",           // kept: existing callers read it
  "hasCertificate": true,
  "certificateId": "uuid | null",

  "lastLectureId": "uuid | null",        // UNCHANGED MEANING — last *accessed*
  "lastLectureTitle": "string | null",   //   including a completed one

  "completedLectureCount": 14,           // NEW
  "continueLecture": {                   // NEW — see §1.4
    "id": "uuid", "title": "Convolutional Layers", "sectionTitle": "Module 4"
  } | null,
  "remainingDurationSecs": 8100,         // NEW

  "certificate": {                       // NEW — completed enrollments only, else null
    "number": "DNA-2026-000118",
    "issuedAt": "2026-09-06T10:09:53.724Z",
    "finalGradePct": 96,                 // null when the course has no submitted attempts
    "gradeLabel": "A+"                   // null when finalGradePct is null
  } | null
}
```

**`lastLecture*` is not redefined.** It stays "the last lecture this student opened", written by
`PlayerService.loadLecture` on every access including completed ones — Epic 4.2 D7 made
revisiting a finished lecture free, and this field is what remembers it. The draft redefined it
as "most recently accessed *incomplete* lecture", which would have silently broken
"continue where you left off" for anyone who reviewed a finished lecture.

### 1.4 `continueLecture` — one field, two UI slots

Serves both the **Continue** button target and the design's **"Next: Module 4 · Convolutional
Layers"** line. The draft had these as two fields (`lastLecture` redefined + `nextLecture`);
they are the same lecture and must never disagree.

Resolution order, in course reading order (sections by `displayOrder`, then lectures by
`displayOrder`):

```
1. If enrollment.lastLecture exists AND its lecture_progress.status = 'in_progress'
     → that lecture                          (resume where the student stopped)
2. Else → the first lecture whose status is not 'completed'
                                             (start the next thing)
3. Else → null                               (every lecture done)
```

Client behaviour follows directly, with no extra rules:

| `continueLecture` | Card CTA | Target |
|---|---|---|
| non-null, `progressPct > 0` | **Continue** | `continueLecture.id` |
| non-null, `progressPct === 0` | **Start** | `continueLecture.id` — step 2 gives the first lecture |
| `null` | **Review Content** | first lecture in course order |

`remainingDurationSecs` = Σ `durationSecs` of every lecture whose status is not `completed`.
`0` when `continueLecture` is null.

### 1.5 Grade — frozen onto the certificate

> **Revised 10/09/2026.** The original decision computed this live on every read. A student who
> retook a quiz after finishing therefore saw the grade beside their certificate change while
> the certificate itself stood still — two numbers describing one achievement, disagreeing.
> The grade is now part of the frozen record.

`certificate.finalGradePct` is written **once**, when the certificate is issued, as
`MAX(quiz_attempt.score)` over the student's submitted attempts for that course. `score` is
already an integer percentage (`quiz.service.ts` — `Math.round(grade.score * 100)`).

```
>= 95 A+ | >= 90 A | >= 85 B+ | >= 80 B | >= 75 C+ | >= 70 C | >= 60 D | else F
```

Only the percentage is stored; the letter is derived by `gradeLabelFor`. Storing both is how
the two end up disagreeing.

**Nothing recomputes it.** Not a retake, not a progress reset, not
`POST /enrollments/:id/certificate/regenerate` — that endpoint corrects *who* a certificate is
for (a misspelt name, a retitled course) and must never rewrite *what was earned*, or an admin
fixing a typo would silently change a grade.

Consequences, recorded so they are not reported as bugs:

- It is still the student's **best single quiz**, not a course average — a student who aced one
  quiz and failed four was frozen at `A+`.
- `DELETE /admin/enrollments/:id/progress` (Epic 4.2 BUG-07) deletes quiz attempts and keeps the
  certificate. The grade survives, because it no longer depends on the attempts.
- Certificates issued before this revision were **backfilled once** by migration
  `1787000000000`, from the attempts that existed at that moment. That is an approximation of
  what the grade was at issue; it is the best available and it only ever ran once.

### 1.6 `GET /students/me/stats`

```jsonc
{ "lecturesCompleted": 142, "totalStudyHours": 148.5, "certificatesCount": 6 }
```

Read-only aggregate over **all** the student's enrollments; no pagination, no params.

**`lecturesCompleted`, not `modulesCompleted`.** It counts `lecture_progress` rows with
`status = 'completed'`. The design labels the tile "Modules Completed" while the number is
lectures; the API uses the honest name and the client's label is a translation string, not a
contract.

`totalStudyHours` per D2. `certificatesCount` = `COUNT(certificate)` for the student.

---

## 2. Backend work

**~1.5 days.** All in `src/course-catalog/` plus four new batched repository methods.

### BE-1 — Batched repository methods (do this first)

Every one of these exists in a per-row form today and would be an N+1 on a 6-card page.

| Repository | Add | File |
|---|---|---|
| `LectureProgressRepository` | `findByEnrollmentIds(ids: string[]): Promise<LectureProgress[]>` | `src/lecture-progresses/infrastructure/persistence/` + relational impl |
| `CertificateRepository` | `findByEnrollmentIds(ids: string[]): Promise<Certificate[]>` | `src/certificates/infrastructure/persistence/` + relational impl |
| `QuizAttemptRepository` | `findSubmittedByEnrollmentIds(ids: string[]): Promise<QuizAttempt[]>` | `src/quiz-attempts/infrastructure/persistence/` + relational impl |
| `CourseCurriculumService` | `orderedLecturesForCourses(courseIds: string[]): Promise<Map<string, CurriculumLecture[]>>` | `src/learning/services/course-curriculum.service.ts` |

`orderedLecturesForCourses` matters most: the existing `orderedLectures` issues one query per
section (`course-curriculum.service.ts:26-44`), so calling it per card is
`6 × (1 + sections)` queries. Replace with a single join over `section` + `lecture` for all
course ids, sorted by `section.displayOrder, lecture.displayOrder`, grouped in memory.

Each method returns `[]` immediately for an empty id list — never issue `IN ()`.

### BE-2 — Rewrite `findMyCourses`

`src/course-catalog/course-enrollment.service.ts:96-130`.

**Fix the existing N+1 while you are here:** the current implementation wraps the map in
`Promise.all` and calls `certificatesService.findByEnrollmentId` per completed enrollment. That
goes away with BE-1.

Shape of the new implementation, in order:

1. Load the student's enrollments (`findByStudentId`, already loads `lastLecture`).
2. Compute `counts` from the full set, before filtering.
3. Filter by `status`, sort per §1.2, slice the page.
4. For the page only: batch-load progress rows, certificates, quiz attempts, group ids and
   ordered curricula.
5. Map each row, computing `completedLectureCount`, `continueLecture` (§1.4),
   `remainingDurationSecs`, and `certificate` (§1.5).

Steps 2-3 run in memory. A student with hundreds of enrollments is not a case worth a second
query today; revisit if one appears.

**New DTOs** in `src/course-catalog/dto/my-course.dto.ts`: `MyCourseGroupRefDto`,
`ContinueLectureDto`, `MyCourseCertificateDto`, `MyCoursesCountsDto`,
`MyCoursesResponseDto`. Extend `EnrolledCourseRefDto` with `language`, `totalLectures`,
`totalDurationSecs`, `courseGroup`.

**Query DTO** `FindMyCoursesDto` with `status`, `page`, `limit` — `@IsIn(['in_progress','completed'])`,
`@Type(() => Number) @IsInt() @Min(1)`. The global pipe runs `whitelist: true`, so any param
not declared here is dropped silently with a 200.

### BE-3 — `GET /students/me/stats`

New method on `CourseEnrollmentService`, new `@Get('stats')` on a controller under
`students/me`. Three aggregates, three queries, no joins per row. Guarded by
`AuthGuard('jwt')` like its sibling.

Note: `StudentCoursesController` is mounted at `path: 'students/me/courses'`, so `stats` needs
its own controller (`students/me`) or an explicit route. Do not nest it under `courses`.

### BE-4 — Tests

`src/course-catalog/my-courses-v2.service.spec.ts` exists; extend it.

Required cases:

- `counts` unaffected by `?status=` — the D3/AC-2 contradiction, asserted directly.
- Ordering: an `in_progress` row with a recent `lastAccessedAt` sorts above a `completed` row
  finished yesterday; two rows with equal keys keep a stable order across pages.
- `continueLecture` step 1: `lastLecture` is `in_progress` → that lecture.
- `continueLecture` step 2: `lastLecture` is `completed` → the next non-completed lecture, **not**
  the last accessed one.
- `continueLecture` step 3: every lecture completed → `null`, `remainingDurationSecs === 0`.
- `lastLectureId` still points at a completed lecture after the student reviews one — the
  regression guard for §1.3.
- Grade: no submitted attempts → `finalGradePct` and `gradeLabel` both `null`; boundary at 95
  → `A+`; 94 → `A`.
- `isArchived` true when `course.status !== 'published'`, and the enrollment still appears.
- A page of 6 issues a bounded number of queries — assert the repository mocks are each called
  **once**, which is what makes BE-1 verifiable rather than aspirational.

---

## 3. Frontend work

**~3 days.** Repo: `dna-academy-client`.

### FE-1 — Types and query layer

`src/services/api/types/catalog.ts` — extend `MyCourse` per §1.3, add `MyCoursesResponse`,
`MyCourseCounts`, `ContinueLecture`, `MyCourseCertificate`, `LearningStats`.

`src/services/api/services/catalog.ts` — `useGetMyCoursesService` gains `status`, `page`,
`limit`; add `useGetLearningStatsService`.

`src/app/[language]/(student)/queries/queries.ts` — `useMyCoursesQuery` **now unwraps an
envelope**; every existing caller reads `.data`. Add `useLearningStatsQuery`. Key both on the
user id, per the lesson in [`epic_4_3_fe.md`](./epic_4_3_fe.md) FE-4.

**Check every `useMyCoursesQuery` caller before changing it.** The certificate screen no longer
uses it (Epic 4.1 D6 moved that data to the certificate response), but verify rather than
assume.

### FE-2 — Store `useMyCoursesStore`

New, in `src/store/`. Mirror `use-course-filter-store.ts`, which already solves page-reset:

```ts
type State = {
  activeTab: 'all' | 'in_progress' | 'completed';
  page: number;
  limit: number;   // 6, D8
};
```

Data lives in React Query, not the store — the catalog store's split is the precedent. A tab
change resets `page` to 1; a page change does not touch the tab.

### FE-3 — Dashboard shell

`src/app/[language]/(student)/students/me/courses/page-content.tsx` — modify.

- Tabs read `counts` from the response instead of filtering the array client-side
  (currently lines 42-46). **Delete `matchesTab` and the client-side count reduce**; they are
  wrong the moment the list is paginated.
- `activeTab` maps to `?status=`: `all` → omit, `in_progress` / `completed` → pass through.
- Fetch courses and stats in parallel.
- `data[0]` renders as the featured card; `data[1..]` as standard cards. No client re-sorting.

### FE-4 — Cards

| Component | State | Notes |
|---|---|---|
| `<FeaturedCourseCard />` | **new** | 2-col: thumbnail, `courseGroup.name` chip, `{completedLectureCount} / {course.totalLectures} Lectures` overlay, progress bar, `Next: {continueLecture.sectionTitle} · {continueLecture.title}`, time-left from `remainingDurationSecs`, Continue |
| `<EnrollmentCard />` | **modify** | Exists. Add the group chip, lecture counter and time-left; keep the archived treatment and status badge |
| `<CompletedCourseCard />` | **modify `<EnrollmentCard/>`** | A completed-status branch, not a third component: 100% pill, finished date, grade row (omit when `certificate.finalGradePct` is null), View Certificate / Review Content / Share |

Formatting rules, both cards: `remainingDurationSecs` renders as `2h 15m` / `35 min` / omitted
when `0`. `finalGradePct` and `gradeLabel` render together or not at all.

### FE-5 — `<LearningMomentumStats />`

Three tiles from `/students/me/stats`. Label the first tile with the design's wording; bind it
to `lecturesCompleted` (§1.6).

### FE-6 — `<CoursePagination />`

Reuse `src/components/catalog/CatalogPagination.tsx` — same props, same behaviour, already
handles disabled edges. "Showing x–y of N" from `page`, `limit`, `totalCount`.

### FE-7 — Certificate modal

`<CertificateModal />` wrapping the existing `<CertificateCard />` from
`src/components/certificate/`, fed by `GET /enrollments/:id/certificate`.

- **Download = `window.print()`**, one button. The certificate screen already does exactly this
  (`certificates/[enrollmentId]/page-content.tsx`) and carries the print stylesheet. There is no
  download endpoint (§1.1).
- Verify link → `/{locale}/verify/{number}`, the existing public page.
- Share → clipboard copy of the verify URL (D6).
- Rating/reflection → link to `/{locale}/certificates/{enrollmentId}` (D5).

### FE-8 — States

Skeleton on every fetch (reuse `<CatalogSkeleton />`'s approach), empty state per tab
("no courses in progress" ≠ "no courses at all"), error state, archived card disabled per the
existing treatment.

### FE-9 — Not building

Header scoped search, `<SearchResultsDropdown />`, the notifications icon (D0, D7). The header
keeps Epic 4.4's behaviour: global full-text search routing to `/courses?search=`.

---

## 4. Acceptance criteria

| # | Scenario | Pass condition |
|---|---|---|
| AC-1 | Dashboard lists current and previous enrollments | all statuses present in `all`, including `cancelled` and archived |
| AC-2 | Tab counters | All / In Progress / Completed all correct **while a filtered tab is active** — the `counts` object, not the page |
| AC-3 | Card fields | title, thumbnail, enrollment date, `progressPct`, last accessed lecture, status, completion all render from the DTO |
| AC-4 | Continue on a partially watched lecture | navigates to that lecture, not the next one |
| AC-5 | Continue after reviewing a finished lecture | navigates to the first non-completed lecture; `lastLectureTitle` still shows the reviewed one |
| AC-6 | Start on a never-opened course | navigates to the first lecture in course order |
| AC-7 | Fully completed course | `continueLecture` null, CTA reads Review Content, `remainingDurationSecs` 0 |
| AC-8 | Only active enrollments enter the player | cancelled/archived card CTA disabled; player route still enforces its own guard |
| AC-9 | First access | `startedAt` stamped, status → `in_progress` (existing `POST /enrollments/:id/start`) |
| AC-10 | Completed card grade | grade row renders with `finalGradePct` + `gradeLabel`; **absent entirely** when no attempts exist |
| AC-11 | Certificate modal | number, dates, issuer, signature, verify link render; Download prints the card |
| AC-12 | Momentum stats | three tiles from `/students/me/stats` |
| AC-13 | Pagination | "Showing x–y of N", prev/next, numbered, edges disabled; page 2 repeats no row from page 1 |
| AC-14 | Archived course | chip renders, enrollment retained, CTA disabled |
| AC-15 | Featured card | `data[0]`, and it is the most recently accessed in-progress course |
| AC-16 | Query count | one page of 6 issues a bounded number of queries — no per-card certificate, progress or curriculum lookup |

---

## 5. Sequence

| Phase | Work | Size | Blocks |
|---|---|---|---|
| 0 | Epic 4.2 FE §2.1 + §2.4 (D9 prerequisite) | ~2h | the time figures, not the build |
| 1 | BE-1 batched repository methods | ~3h | BE-2 |
| 2 | BE-2 `findMyCourses` rewrite + DTOs | ~5h | FE-1 |
| 3 | BE-3 stats + BE-4 tests | ~3h | — |
| 4 | FE-1 types/queries, FE-2 store, FE-3 shell | ~1d | FE-4 |
| 5 | FE-4 cards, FE-5 stats, FE-6 pagination | ~1d | — |
| 6 | FE-7 modal, FE-8 states | ~0.5d | — |
| 7 | AC-1…AC-16 | ~0.5d | — |

BE before FE: the envelope change (§1.2) breaks `useMyCoursesQuery`, so the two land together
or the dashboard is broken in between.

## 6. Definition of done

> **Backend complete, 10/09/2026.** Shapes and verification transcripts in
> [`epic_4_5_api.md`](./epic_4_5_api.md). The frontend half (§3) lives in
> `dna-academy-client` and has not started.

- [x] `GET /students/me/courses` returns the envelope with `counts`, filtered, sorted and paginated per §1.2.
- [x] `continueLecture` resolves per §1.4 in all three branches; `lastLecture*` unchanged in meaning.
- [x] `GET /students/me/stats` live, mounted at `students/me` (BE-3).
- [x] No per-card query for certificates, progress, quiz attempts, groups or curriculum (AC-16) — asserted, each loader called exactly once for a page of six.
- [ ] Client-side tab counting deleted; counters read `counts`. — **FE, blocked on nothing but the client repo.**
- [x] Certificate modal Download prints; no download endpoint was added.
- [ ] AC-1…AC-16 green. — **AC-2, AC-4…AC-7, AC-10, AC-16 covered server-side; the rest are FE render assertions.**
- [ ] D9's two Epic 4.2 fixes shipped, or the time figures are explicitly labelled estimates. — **not shipped; §3 of the API contract labels the figures.**

### Backend state

| BE task | Status |
|---|---|
| BE-1 batched repository methods | ✅ 5 added (the plan listed 4; the course-group label needed a fifth) |
| BE-2 `findMyCourses` rewrite + DTOs | ✅ envelope, filter, sort, page, 6 new DTOs, query DTO |
| BE-3 `GET /students/me/stats` | ✅ new `StudentStatsController` at `students/me` |
| BE-4 tests | ✅ 39 unit + 20 grade unit + 13 e2e |

| Suite | Before | After |
|---|---|---|
| Unit | 891 / 77 suites | **944 / 78 suites** |
| E2E | 284 / 22 suites | **297 / 23 suites** |

*End of Epic 4.5.*
