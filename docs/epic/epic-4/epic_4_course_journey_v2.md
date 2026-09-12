# Epic 4 — Course Discovery, Enrollment, Learning & Completion (v2.3)

> **v2 changelog:** merged the previous Discovery & Enrollment spec with the new Learning + Completion scope, and annotated every existing implementation with **KEEP** / **MODIFY** / **ADD**. Written for AI agents / new contributors — terse, structured, checkable.
>
> **v2.1 changelog — Auto-Grading rework (this revision):**
> - **No manual grading queue.** `ADM_GRD_01` screen, `<GradingQueueStore>`, `<AwaitingReviewChip />` and all `passed: null` handling are removed from the spec.
> - **Essay + file_upload questions auto-pass** on any non-empty submit (no scoring).
> - **Only objective types are graded:** `multiple_choice`, `true_false` (all-or-nothing) and `multiple_select` (**partial credit** — see §2.4).
> - **Per-quiz pass threshold** `pass_threshold_percent` on `lecture_content_quiz`; DB default sourced from env `QUIZ_PASS_THRESHOLD_DEFAULT` (default `70`).
> - **Retries unlimited.** Best score = `MAX(score_percent)` computed on read from `quiz_attempts`; no new column.
> - **Reflection minimum length** hardcoded from env `REFLECTION_MIN_WORDS` (default `10`).
> - **On pass** → auto-advance to `nextLectureId`; **on fail** → inline review state on the same quiz screen (no new screen). Failed attempts do **not** mark the lecture complete.
>
> ~~**Section 4 (API Integration) is intentionally NOT edited** in this revision — the user reconciles it during BE integration.~~ **Reconciled at v2.3** — §4 now describes the shipped API.
>
> **v2.2 changelog — Player feedback pass (this revision):**
> - **Notes / Q&A / Resources tabs — HIDE V1** on all 4 player screens. Mockup keeps them visually only where already drawn; runtime hides them until schema exists. Deferred to V2 backlog.
> - **PDF metadata (pageCount, sizeBytes) — NOT added.** Rendered via PDF.js which reads `numPages` client-side; sizeBytes not shown. Removed from `§5.5` MODIFY list.
> - **Content reports — mailto V1.** No BE, no modal, no `content_reports` table. `<a href="mailto:support@dna.edu?subject=...&body=...">` with prefilled course + lecture + URL context.
> - **Lecture description — new column** `lectures.description text NULL`. Exposed on `LectureViewDto.description`. Article renderer shows it below title when non-null; do **not** fall back to `courses.short_description`. Admin `ADM_CUR_15` adds a Description textarea per lecture.
> - **Quiz file upload multer filter — BE service-layer validation.** Override boilerplate multer `fileFilter` for `/quiz-attempts/:id/answers/:qid/file` to accept-all; enforce MIME + size against per-question `allowedMimeTypes` / `maxFileSizeMb` inside the service. Presigned upload flow deferred to V1.1.
> - **Sidebar progress persistence — BLOCKER fix.** `GET /courses/:slug` `curriculum[].lectures[]` now includes `progressStatus`, `isLocked`, `lockReason`, `watchDurationSecs` when the caller is enrolled. Guest / unauthenticated → these fields are `null` and `isLocked` is computed from `is_preview` + `requires_sequential_completion` only.
> - **Section 4 impact:** `LectureViewDto.description` and the 4 new `CourseOverviewDto.curriculum[].lectures[]` fields — both now documented in §4.2 / §4.3.
>
> **v2.3 changelog — Quiz answer explanation (this revision):**
> - **`quiz_questions.explanation` added** — nullable `text` column (§2.1). Resolves the confirmed gap: `§5.6`'s "(if any)" had no backing column, so the explanation could never be populated. One nullable column = one metadata-only ALTER, non-breaking.
> - **Reveal gating:** `explanation` is answer-key material, same secrecy class as `is_correct`. It is **stripped from every pre-submit payload** (`POST .../quiz-attempts`, resume) and delivered only in post-submit feedback (the fail-review panel). `NULL` → no explanation box rendered.
> - **Admin:** optional "Explanation" textarea per question in the quiz builder (`ADM_CUR_15`), plain text, escaped on render.
> - **Section 4 reconciled (v2.3).** §4 was rewritten against the shipped implementation: every path, field and status code below was read out of the code, not the spec. `explanation` is documented as post-submit-only in §4.6/§4.7/§4.9.

## Stack
- **BE:** NestJS (`brocoders/nestjs-boilerplate`, PostgreSQL variant, TypeORM)
- **FE:** Next.js (`brocoders/extensive-react-boilerplate`), Zustand
- **DB:** PostgreSQL

## DB tables involved (existing schema)
`courses`, `course_group_assignments`, `course_learning_outcomes`, `course_requirements`, `course_target_learners`, `sections`, `lectures`,
`lecture_content_video`, `lecture_content_article`, `lecture_content_document`, `lecture_content_quiz`, `lecture_content_reflection`,
`quiz_questions`, `quiz_answer_options`, `quiz_attempts`, `quiz_attempt_answers`, `quiz_saves`,
`reflection_questions`, `reflection_responses`,
`enrollments`, `lecture_progress`,
`certificates`, `course_ratings`,
`career_reflection_questions`, `career_reflection_answers`,
`master_data_code` / `master_data_group`.

---

## Section 1 — Screen Inventory

| Screen ID | Name | Status |
|---|---|---|
| `STU_CAT_03` | Course Catalog | Existing implementation ✅ — **MODIFY** (see §5.1) |
| `STU_OVR_04` | Course Overview | Existing implementation ✅ — **MODIFY** (see §5.2) |
| `STU_MYC_05` | My Courses | Existing implementation ✅ — **MODIFY** (see §5.3) |
| `STU_PLV_06` | Course Player · Video | Existing implementation ✅ — **MODIFY** (see §5.4) |
| `STU_PLA_07` | Course Player · Article/PDF | Existing implementation ✅ — **MODIFY** (see §5.5) |
| `STU_PLQ_08` | Course Player · Quiz | Existing implementation ✅ — **MODIFY** (see §5.6) |
| `STU_PLR_09` | Course Player · Reflection | Existing implementation ✅ — **MODIFY** (see §5.7) |
| `STU_CER_10` | Completion & Certificate | Existing implementation ✅ — **MODIFY** (out of this file's scope) |
| `Preview Lecture Modal` | Guest previews `is_preview=true` lecture | **ADD** |
| `Enrollment Success` | Post-enroll confirmation flow | **ADD** |
| `Access Denied (Locked Lecture)` | Sequential-completion block | **ADD** |
| ~~`ADM_GRD_01`~~ | ~~Instructor grading queue~~ | **REMOVED in v2.1** — see §2.4 auto-grading rules; essay/file_upload now auto-pass, only objective types are scored. |

---

## Section 2 — BE Work

### 2.1 Data model changes (single migration)

```sql
-- Fix types
ALTER TABLE courses ALTER COLUMN avg_rating TYPE decimal(3,2);

-- Enforce single active enrollment per (student, course)
CREATE UNIQUE INDEX ux_active_enrollment
  ON enrollments (student_id, course_id)
  WHERE status <> 'cancelled';

-- enrollment_source → ENUM
CREATE TYPE enrollment_source_enum AS ENUM ('organic','admin','coupon');
ALTER TABLE enrollments
  ALTER COLUMN enrollment_source TYPE enrollment_source_enum
  USING enrollment_source::enrollment_source_enum;

-- Sequential completion flag on courses
ALTER TABLE courses
  ADD COLUMN requires_sequential_completion boolean NOT NULL DEFAULT false;

-- Publish audit
ALTER TABLE courses
  ADD COLUMN unpublished_at timestamptz,
  ADD COLUMN unpublished_by uuid REFERENCES users(id);

-- Quiz time limit (optional feature)
ALTER TABLE lecture_content_quiz
  ADD COLUMN time_limit_secs int;   -- NULL = no limit

-- Per-quiz pass threshold (v2.1 auto-grading).
-- DB default is a fixed 70 so the migration is deterministic; the
-- application layer overrides this default from env QUIZ_PASS_THRESHOLD_DEFAULT
-- when creating a new quiz row (see §2.4).
ALTER TABLE lecture_content_quiz
  ADD COLUMN pass_threshold_percent smallint NOT NULL DEFAULT 70
    CHECK (pass_threshold_percent BETWEEN 0 AND 100);

-- passing_score column becomes unused for v2.1 grading; keep for backward
-- compat / historical attempts. New code MUST read pass_threshold_percent.

-- v2.2: per-lecture description (article body header, PDF caption, etc.).
-- MUST NOT fall back to courses.short_description at read time — a null
-- description means the FE hides the block.
ALTER TABLE lectures
  ADD COLUMN description text;

-- v2.3: per-question explanation shown in quiz fail-review feedback.
-- NULL = no explanation authored. Delivered ONLY post-submit — it is
-- answer-key material and must be stripped from pre-submit payloads
-- together with is_correct.
ALTER TABLE quiz_questions
  ADD COLUMN explanation text;

-- Career reflection category (needed for aggregation dashboards)
ALTER TABLE career_reflection_questions
  ADD COLUMN category varchar(50);  -- interest|understanding|confidence|skill_fit|advanced_intention|overall_usefulness

-- Value constraints
ALTER TABLE course_ratings          ADD CONSTRAINT ck_rating_1_5     CHECK (rating BETWEEN 1 AND 5);
ALTER TABLE courses                 ADD CONSTRAINT ck_avg_rating_0_5 CHECK (avg_rating IS NULL OR avg_rating BETWEEN 0 AND 5);
ALTER TABLE enrollments             ADD CONSTRAINT ck_progress_0_100 CHECK (progress_pct BETWEEN 0 AND 100);
ALTER TABLE lecture_content_quiz    ADD CONSTRAINT ck_passing_0_100  CHECK (passing_score BETWEEN 0 AND 100);

-- Hot-read indexes
CREATE INDEX ON enrollments (student_id, status);
CREATE INDEX ON lectures    (section_id, display_order);
CREATE INDEX ON sections    (course_id, display_order);
CREATE INDEX ON courses     (status, published_at DESC);
CREATE INDEX ON lecture_progress (enrollment_id, status);
```

### 2.2 Existing endpoints — KEEP / MODIFY

| Endpoint | Status | Change |
|---|---|---|
| `GET /api/v1/courses` (catalog) | **MODIFY** | Replace `instructorName` with `primaryInstructor { id, fullName, slug, profilePictureUrl }` + `coInstructorCount` (EPIC 5). Localize `level.name` (EPIC 6). Add filters: `careerFieldId`, `minDurationSecs`, `maxDurationSecs`, `hasCertificate`, `sortBy`. Search must include primary + co-instructor names + headlines. Add `Vary: X-Locale`. |
| `GET /api/v1/courses/:slug` (overview) | **MODIFY** | Replace `instructor` with `primaryInstructor{...}` + `coInstructors[]` (each with `expertise[]`, `socialLinks[]`, `bio`, `headline`). Include `requiresSequentialCompletion`. Localize all master-data-derived labels. **v2.2:** each `curriculum[].lectures[]` element MUST also include `progressStatus` (`not_started \| in_progress \| completed \| null`), `isLocked` (bool), `lockReason` (`PREVIOUS_LECTURE_INCOMPLETE \| NOT_ENROLLED \| null`), and `watchDurationSecs` (int, video only). Enrolled caller → JOIN `lecture_progress` for real values; guest/unauthenticated → `progressStatus=null`, `isLocked = requires_sequential_completion && !is_preview`, `watchDurationSecs=null`. Join must be batched (`WHERE lecture_id IN (…)`) — no N+1. Cache key MUST include `userId` when present. |
| `POST /api/v1/courses/:slug/enroll` | **KEEP** | Add rate-limit (5/min per user). Optional `Idempotency-Key` header support. ✅ Done — see §4.12. |
| `GET /api/v1/students/me/courses` | **MODIFY** | Add fields: `courseThumbnailUrl`, `enrollmentDate`, `completedAt`, `lastLectureTitle`, `certificateId` (when completed), `hasCertificate` (from course). |

### 2.3 New endpoints — ADD (learning flow)

Group by concern. All require JWT + `OnboardingGuard` unless noted.

**Player — start / navigation**
| Method | Path | Purpose |
|---|---|---|
| `POST` | `/enrollments/:id/start` | Flip status `enrolled → in_progress`, set `started_at` |
| `GET`  | `/courses/:slug/lectures/:lectureId` | Load lecture content (video/article/document/quiz/reflection); enforce enrollment + sequential lock; returns `prevLectureId`, `nextLectureId`, `isLocked`, `lockReason` |
| `GET`  | `/courses/:slug/preview-lectures/:lectureId` | **No auth**; only when `is_preview=true`; never writes progress |

**Progress**
| Method | Path | Purpose |
|---|---|---|
| `POST` | `/lectures/:lectureId/progress` | Body: `{ status: 'in_progress'\|'completed', watchDurationSecs? }`. Update `lecture_progress`, recompute `enrollments.progress_pct`, transition enrollment status when needed, auto-fire completion detection |
| `PUT`  | `/lectures/:lectureId/watch-position` | Throttled every 15s; store `watch_duration_secs` on `lecture_progress` (video resume) |

**Quiz**
| Method | Path | Purpose |
|---|---|---|
| `POST` | `/lectures/:lectureId/quiz-attempts` | Create attempt row, return questions (strip `is_correct` **and `explanation`** — both are answer-key material and must not leak pre-submit; v2.3) |
| `PUT`  | `/lectures/:lectureId/quiz-save` | Upsert `quiz_saves.answers_json`, 30s debounce |
| `POST` | `/quiz-attempts/:id/submit` | Auto-grade objective types; **v2.1:** essay / file_upload / short_answer / rating_scale auto-pass on non-empty answer — no manual grading queue. Returns `{ score, passed: true \| false, feedback[] }`. See §2.4 `QuizGraderService`. |
| `GET`  | `/quiz-attempts/:id` | Detail incl. review data (correct answer, explanation) once submitted |
| `POST` | `/quiz-attempts/:id/answers/:qid/file` | Upload file → R2, return `file_id` |

**Reflection lecture**
| Method | Path | Purpose |
|---|---|---|
| `POST` | `/lectures/:lectureId/reflection-responses` | Validate `min_response_length`, upsert rows into `reflection_responses`; mark lecture complete |
| `GET`  | `/lectures/:lectureId/reflection-responses` | Get existing responses (for resume / read-only after submit) |

**Certificate & completion**
| Method | Path | Purpose |
|---|---|---|
| `GET`  | `/enrollments/:id/certificate` | Returns `{ ready: bool, certificate?: { number, url } }`. Server-side: format `DNA-{YYYY}-{6-digit-seq}`; render on-the-fly from snapshot if `file_id IS NULL`; otherwise return R2 URL |
| `POST` | `/enrollments/:id/certificate/regenerate` | Admin-only |

**Rating & Career Reflection (post-completion form)**
| Method | Path | Purpose |
|---|---|---|
| `GET`  | `/career-reflection-questions?courseId=<id>` | Course-specific + `course_id IS NULL` global; return grouped by `category` |
| `POST`/`PUT`/`GET` | `/enrollments/:id/rating` | 1–5 rating + optional review; sets `review_status='pending'` |
| `POST`/`GET` | `/enrollments/:id/career-reflection` | Bulk submit answers |

### 2.4 Server-side services

- **`CompletionDetectorService`** — on `POST /lectures/:lectureId/progress` success → recompute `progress_pct = completed_required_lectures / total_required_lectures × 100`. When 100%: set `enrollments.status='completed'`, `completed_at=NOW()`, fire `CertificateGeneratorService`.
- **`CertificateGeneratorService`** — snapshot `student_name` and `course_title` into `certificates`; generate `certificate_number`; render PDF via headless Chromium; upload R2; store `file_id`.
- **`QuizGraderService`** — **v2.1 auto-grading, no manual queue**:
  - Grades **only objective question types**:
    - `multiple_choice` → all-or-nothing (exact single choice match)
    - `true_false` → all-or-nothing
    - `multiple_select` → **partial credit**. Score per question =
      `max(0, (correct_selected - wrong_selected) / total_correct_choices)`
      clamped to `[0, 1]`. Selecting every option therefore scores 0, and
      selecting a subset of correct choices scores proportionally.
  - **Auto-passes** every `essay`, `file_upload`, `short_answer`, `rating_scale`
    question on any non-empty answer (essay/short_answer: text length ≥ 1
    after trim; file_upload: `fileId` present; rating_scale: numeric value
    within `[rating_min, rating_max]`). No scoring, no reviewer.
  - **Score aggregation**: `score_percent =
    Σ(question_score × question_weight) / Σ(question_weight) × 100`, weight
    defaulting to 1. Auto-passed subjective questions contribute their full
    weight as if perfectly answered — the pass threshold is not diluted by
    them.
  - **Pass decision**: `passed = score_percent >= lecture_content_quiz.pass_threshold_percent`.
  - **On pass**: insert `quiz_attempts` row with `passed=true`; call
    `CompletionDetectorService` for that lecture (marks
    `lecture_progress.status='completed'`).
  - **On fail**: insert `quiz_attempts` row with `passed=false`; lecture
    remains `in_progress`; retries are **unlimited** — a new attempt is
    simply another row.
  - **Best score** for reporting = `MAX(score_percent)` across the user's
    `quiz_attempts` for that quiz, computed on read; no dedicated column.
- **`ReflectionValidatorService`** — enforces `word_count(response) >=
  REFLECTION_MIN_WORDS` (env, default `10`) per question. On submit with
  every required question passing → mark lecture complete via
  `CompletionDetectorService`. Non-empty drafts (`isDraft: true`) skip
  the threshold and do not complete.
- **`QuizFileUploadValidator` (v2.2)** — the boilerplate multer filter for
  `FILE_DRIVER=local` only accepts `jpg|jpeg|png|gif` and rejects PDF /
  DOCX before the handler runs. Override the filter for the
  `/quiz-attempts/:id/answers/:qid/file` route to **accept-all** with a
  hard cap `fileSize: 50 MB`, then validate at the service layer against
  the question's own `allowedMimeTypes` (returning `422
  cantUploadFileType`) and `maxFileSizeMb` (`422 fileTooLarge`). The
  service is the only place that has the per-question context — multer
  cannot. Presigned drivers (`s3-presigned` / equivalent) still return
  `501 uploadNotSupportedByFileDriver`; presigned upload flow is
  deferred to V1.1.
- **`SequentialLockService`** — on `GET .../lectures/:id`, if `courses.requires_sequential_completion=true`, check that the previous required lecture has `lecture_progress.status='completed'`; else return `403 { code: 'PREVIOUS_LECTURE_INCOMPLETE', requiredLectureId }`.

### 2.4.1 Environment variables (v2.1)

New env keys — read once at app bootstrap and injected via NestJS `ConfigModule`.

| Env key | Default | Consumed by | Purpose |
|---|---|---|---|
| `QUIZ_PASS_THRESHOLD_DEFAULT` | `70` | `QuizService.create()` | Value written into `lecture_content_quiz.pass_threshold_percent` when a quiz is created without an explicit threshold. Range 0–100. Does **not** override existing rows. |
| `REFLECTION_MIN_WORDS` | `10` | `ReflectionValidatorService` | Minimum word count per required reflection answer for a non-draft submit. Applies globally; not per-lecture. |

Both keys are validated at boot (integer, 0–100 for the threshold, ≥ 1 for
min words); an invalid value fails fast rather than silently defaulting.

### 2.5 Cross-epic dependencies

- **EPIC 5** — replace `courses.instructor_id` reads with `course_instructors` M2M lookup in every list/detail response.
- **EPIC 6** — every localized response reads locale via chain `?locale= → X-Locale → users.locale → Accept-Language → vi`, echoes `resolved_locale` in envelope, uses `Vary: X-Locale` cache headers, applies `coalesce(name_translations->>locale, name)` to master data.

---

## Section 3 — FE Work

### 3.1 Zustand stores — KEEP / MODIFY / ADD

| Store | Status | Notes |
|---|---|---|
| `useCourseFilterStore` | **MODIFY** | Add `careerFieldId`, `minDurationSecs`, `maxDurationSecs`, `hasCertificate`, `sortBy`. Add locale awareness (invalidate on locale switch). |
| `useCourseDetailStore` | **MODIFY** | Add `primaryInstructor`, `coInstructors`, `requiresSequentialCompletion`. Extend CTA state machine to 6 states: `sign_in_to_enroll` / `complete_profile_to_enroll` / `enroll_now` / `start_learning` / `continue_learning` / `enrollment_closed`. |
| `useMyCoursesStore` | **MODIFY** | Add `all` tab. Handle `archived` (course unpublished after enrollment) and `cancelled` states. |
| `useLecturePlayerStore` | **ADD** | Shared across all 4 player screens. Fields: `currentLecture`, `enrollmentId`, `isLocked`, `lockReason`, `prev/nextLectureId`, `progressPct`. Actions: `loadLecture`, `markComplete`, `navigateNext/Prev`, `saveWatchPosition`. |
| `useQuizAttemptStore` | **ADD** | State: `instructions \| in_progress \| submitting \| passed \| failed_review`. Handles attempt lifecycle, autosave, submit. **v2.1: no `awaiting_review` state — essay / file_upload auto-pass, only objective types are graded.** On submit response `passed=true` → transition `passed` then auto-advance to `nextLectureId`. On `passed=false` → transition `failed_review` (inline review on same screen, `attempt_no++` on retry). Autosave must send `{ answersJson }`; a body without that key is rejected. |
| `useReflectionStore` | **ADD** | Handles per-question response, word count, autosave, submit. |
| `useLocaleStore` | **ADD** | EPIC 6 dependency. `currentLocale`, `supportedLocales`, `setLocale()`, `PATCH /students/me/locale`. |
| `useMasterDataStore` | **ADD** | Caches `GET /master-data/codes?groupKey=` per group for the filter sidebar and admin pickers. Responses are complete for a group (§4.17) — no paging loop. Invalidate on locale switch. |
| ~~`useGradingQueueStore`~~ | **REMOVED in v2.1** | Grading queue no longer exists — see §2.4. |

### 3.2 Shared components — ADD (used across player screens)

- `<PlayerHeader />` — back, course title, breadcrumb, progress ring, language switcher, avatar
- `<CurriculumSidebar />` — accordion sections with lecture rows; states: locked / available / in-progress / completed; active highlight; preview badge
- `<LectureNavigationBar />` — Previous / completion chip / Next
- `<MarkCompleteButton />` — states: `Mark as Complete` / `✓ Completed`
- `<LectureMetaBlock />` — title, type badge, duration, section name, instructor mini
- `<AccessDeniedState />` — locked lecture placeholder (previous lecture must be completed)
- `<AutoSaveIndicator />` — `saving | saved | failed-retry`
- `<LanguageSwitcher />` — EPIC 6
- `<InstructorMiniCard />` — click → open profile drawer (EPIC 5)
- `<EnrollButton />` — sends an `Idempotency-Key` header so a double tap lands on the success path instead of 409, and surfaces `429 RATE_LIMITED` with `retryAfterSecs` (§4.12)
- `<QuizFileDropzone />` — uploads to `/quiz-attempts/:id/answers/:qid/file`, shows the question's own `allowedMimeTypes` / `maxFileSizeMb` chips, and keeps the returned `fileId` for submit (§4.10). **v2.1: presence of a `fileId` is treated as auto-pass for that `file_upload` question — no reviewer.**
- `<QuizPassToast />` — 2s toast on submit success ("Passed! Score {X}% · Threshold {Y}%") then auto-navigate to `nextLectureId`
- `<QuizFailReviewPanel />` — inline review state on the same quiz screen when `passed=false`: red banner "Not passed. Score {X}% / Threshold {Y}%.", per-question ✗ markers with correct answers revealed, **[Retry]** and **[Back to course]** actions
- `<ReportIssueLink />` (v2.2) — plain anchor `<a href="mailto:support@dna.edu?subject=...&body=...">`, subject/body prefilled with course title, lecture title, lecture ID, and `window.location.href`. **No modal, no BE call, no `content_reports` table in V1.**
- `<LectureDescriptionBlock />` (v2.2) — renders `lecture.description` below the lecture title on article / PDF / video screens. Hides entirely when `description` is null / empty. **MUST NOT** fall back to `course.shortDescription` — that made every lecture in a course show the same paragraph.

### 3.3 Rules the FE has to follow

- **Call only what §4.1 lists.** The generated CRUD routes that mirror these
  tables answer 403 to a student token now (§4.14). Anything reading or writing
  another person's record goes through an `/admin/**` route and a permission.
- **A 403 is not always the same thing.** `ONBOARDING_REQUIRED` → send the user
  to onboarding. `NOT_ENROLLED` → send them to the course overview.
  `PREVIOUS_LECTURE_INCOMPLETE` → open `requiredLectureId` (§4.4).
  `PERMISSION_DENIED` → this is an admin surface; hide the control.
- **The answer key never arrives before the submit.** `options[].isCorrect`
  and `questions[].explanation` are stripped from the start-attempt and resume
  payloads (v2.3 — §4.6). Read them from the submit response's `feedback[]` or
  from `GET /quiz-attempts/:id/review`, never from the question objects.
- **Quiz submit is a two-way branch, not three.** `passed=true` → toast +
  auto-advance to `nextLectureId`. `passed=false` → inline review state on
  the same screen with Retry (unlimited). There is **no** `passed=null`
  awaiting-review branch anymore (v2.1 — §2.4). If the API still returns
  `null` for legacy reasons, treat it as `false`.
- **Request bodies are whitelisted server-side.** A key the DTO does not
  declare is silently dropped before the handler sees it, so a typo in a field
  name looks like a no-op rather than an error. Match the shapes in §4 exactly.
- **Branch on the error code, never the status.** Section 4 ends with one table
  (§4.15) covering every code this epic can return.

---

## Section 4 — API Integration

> **Reconciled against the implementation as of v2.3.** Every path, field name
> and status code below was read out of the code, not the spec — where the two
> disagree, this section describes what the server actually does and says so.
>
> All paths are prefixed `/api/v1`. Field names are **camelCase** throughout;
> the epic's SQL is snake_case, the API is not. Unless a row says *public*,
> assume `Authorization: Bearer <jwt>` **plus** a completed onboarding —
> `OnboardingGuard` answers `403 { code: 'ONBOARDING_REQUIRED' }` before any
> handler runs.

### 4.1 Endpoint map

**Discovery and enrolment**

| FE surface | Method | Endpoint | Auth | Response |
|---|---|---|---|---|
| Catalog list | `GET` | `/courses` | *public* | `{ data[], totalCount, page, limit, hasNextPage }` |
| Course overview | `GET` | `/courses/:slug` | *optional JWT* | `CourseOverviewDto` |
| Enroll | `POST` | `/courses/:slug/enroll` | JWT + onboarding | `{ enrollmentId, message }` |
| My courses | `GET` | `/students/me/courses` | JWT | `MyCourseDto[]` |

**Player**

| FE surface | Method | Endpoint | Auth | Response |
|---|---|---|---|---|
| Start enrollment | `POST` | `/enrollments/:id/start` | JWT + onboarding | `{ status, startedAt }` |
| Load lecture | `GET` | `/courses/:slug/lectures/:lectureId` | JWT + onboarding | `LectureViewDto` |
| Preview lecture | `GET` | `/courses/:slug/preview-lectures/:lectureId` | *public* | `LectureViewDto` |
| Progress ping | `POST` | `/lectures/:lectureId/progress` | JWT + onboarding | `{ progressPct, enrollmentStatus }` |
| Watch position | `PUT` | `/lectures/:lectureId/watch-position` | JWT + onboarding | `204` |

**Quiz**

| FE surface | Method | Endpoint | Auth | Response |
|---|---|---|---|---|
| Start attempt | `POST` | `/lectures/:lectureId/quiz-attempts` | JWT + onboarding | `QuizAttemptDto` |
| Autosave draft | `PUT` | `/lectures/:lectureId/quiz-save` | JWT + onboarding | `204` |
| Upload answer file | `POST` | `/quiz-attempts/:id/answers/:questionId/file` | JWT + onboarding | `{ fileId, path }` |
| Submit | `POST` | `/quiz-attempts/:id/submit` | JWT + onboarding | `QuizResultDto` |
| Review | `GET` | `/quiz-attempts/:id/review` | JWT + onboarding | review projection |

**Reflection, completion, certificate**

| FE surface | Method | Endpoint | Auth | Response |
|---|---|---|---|---|
| Reflection load | `GET` | `/lectures/:lectureId/reflection-responses` | JWT + onboarding | `{ minResponseLength, questions[] }` |
| Reflection save / submit | `POST` | `/lectures/:lectureId/reflection-responses` | JWT + onboarding | `{ saved: true }` or `{ progressPct, enrollmentStatus }` |
| Certificate | `GET` | `/enrollments/:id/certificate` | JWT + onboarding | `{ ready, certificate? }` |
| Rating read / upsert | `GET` `POST` `PUT` | `/enrollments/:id/rating` | JWT + onboarding | `RatingDto` |
| Career reflection questions | `GET` | `/career-reflection-questions/grouped?courseId=` | *public* | `{ [category]: Question[] }` |
| Career reflection read / submit | `GET` `POST` | `/enrollments/:id/career-reflection` | JWT + onboarding | `AnswerDto[]` |

**Admin** (JWT + `PermissionGuard`, never called by the student app)

| FE surface | Method | Endpoint | Permission |
|---|---|---|---|
| Regenerate certificate | `POST` | `/enrollments/:id/certificate/regenerate` | `courses:edit` |
| Save lecture content | `PATCH` | `/admin/lectures/:id/content` | `courses:edit` |

> ⚠️ **Two paths deviate from the epic's own wording, on purpose.** The epic
> names `GET /quiz-attempts/:id` and `GET /career-reflection-questions`. Both
> are already owned by the boilerplate-generated CRUD controllers, which are
> now admin-only — calling them with a student token returns **403**, not the
> student's own data. The student-facing routes are
> **`GET /quiz-attempts/:id/review`** and
> **`GET /career-reflection-questions/grouped`**. Use those.

> **Nothing outside these tables is a student-facing endpoint.** The generated
> CRUD routes mirroring these tables — `/enrollments`, `/quiz-attempts`,
> `/lecture-progresses`, `/certificates`, `/course-ratings`, `/quiz-saves`,
> `/quiz-questions`, `/quiz-answer-options`, `/reflection-*`,
> `/career-reflection-*` — all require `courses:edit` and answer **403** to a
> student token. See §4.10.

### 4.2 Course overview — `GET /courses/:slug`

Optional JWT: send the token when you have one and the response gains the
caller's enrollment state and per-lecture progress. Without a token the same
route returns exactly what an anonymous visitor may see.

```jsonc
{
  "id": "uuid", "slug": "career-basics", "title": "Career Basics",
  "shortDescription": "…", "fullDescription": "…",
  "thumbnailUrl": "…", "introVideoUrl": "…",
  "primaryInstructor": { "id": "…", "fullName": "…", "slug": "…", "…": "…" },
  "coInstructors": [],
  "level": { "id": "…", "name": "Beginner" },
  "category": { "id": "…", "name": "Career" },
  "language": "vi",
  "totalDurationSecs": 7200, "totalSections": 3, "totalLectures": 12,
  "price": 0, "isFree": true, "hasCertificate": true,
  "requiresSequentialCompletion": true,
  "avgRating": 4.5, "totalEnrollments": 128,
  "learningOutcomes": ["…"], "requirements": ["…"], "targetLearners": ["…"],
  "groupIds": ["uuid"],
  "curriculum": [
    {
      "id": "uuid", "title": "Getting started", "displayOrder": 1,
      "lectures": [
        {
          "id": "uuid", "title": "Intro", "lectureType": "video",
          "durationSecs": 300, "isPreview": true, "displayOrder": 1,

          // v2.2 — render the sidebar from these four, never from client state
          "progressStatus": "completed",   // | in_progress | not_started | null
          "isLocked": false,
          "lockReason": null,              // PREVIOUS_LECTURE_INCOMPLETE | NOT_ENROLLED
          "watchDurationSecs": 300
        }
      ]
    }
  ],
  "isEnrolled": true, "enrollmentStatus": "in_progress", "enrollmentId": "uuid"
}
```

**The four v2.2 fields, precisely (this is the reload-safety contract):**

| Caller | `progressStatus` | `watchDurationSecs` | `isLocked` | `lockReason` |
|---|---|---|---|---|
| Enrolled, has a progress row | stored status | stored seconds | sequential rule | `PREVIOUS_LECTURE_INCOMPLETE` or `null` |
| Enrolled, no progress row yet | `"not_started"` | `0` | sequential rule | as above |
| Guest / not enrolled / cancelled | `null` | `null` | `requiresSequentialCompletion && !isPreview` | `NOT_ENROLLED` or `null` |

Two consequences worth designing around:

- `progressStatus === null` means **"unknown, not enrolled"**, not "not
  started". Only the string `"not_started"` means the student has this lecture
  and hasn't opened it.
- On a course that is **not** sequential, a guest sees `isLocked: false` on
  every lecture, because the rule §2.2 specifies has no other input. It does
  not mean the guest may open them — gate playback on `isEnrolled` and
  `isPreview`, and treat `isLocked` purely as "show the padlock".

### 4.3 Lecture view — `GET /courses/:slug/lectures/:lectureId`

```jsonc
{
  "lectureId": "uuid", "title": "Lecture A",
  "description": "What this lesson covers",   // v2.2 — null ⇒ render nothing
  "lectureType": "article",
  "durationSecs": 300, "isPreview": false, "requiresCompletion": true,
  "sectionId": "uuid", "sectionTitle": "Getting started",
  "enrollmentId": "uuid",
  "contentPayload": { "bodyHtml": "<p>…</p>" },
  "prevLectureId": null, "nextLectureId": "uuid",
  "isLocked": false, "lockReason": null,
  "progressStatus": "not_started", "watchDurationSecs": 0
}
```

`description` is **never** a fallback for `course.shortDescription` — a null
means hide the block. Falling back made every lecture in a course show the
same paragraph, which is why v2.2 called it out.

`contentPayload` by `lectureType`:

| type | payload |
|---|---|
| `video` | `{ youtubeVideoId, youtubeUrl }` |
| `article` | `{ bodyHtml }` — sanitized server-side, safe to inject |
| `pdf_document` | `{ fileUrl, fileName, isDownloadable }` |
| `quiz` | `{ instructions, passThresholdPercent, passingScore, allowResume, timeLimitSecs, questionCount, previousAttempts, bestScore }` |
| `reflection` | `{ minResponseLength, questions[] }` |

For a quiz lecture read **`passThresholdPercent`**. `passingScore` is the
legacy column, still returned so nothing breaks, and it is *not* what grading
uses — the two can differ.

`previousAttempts` and `bestScore` (4.2 D9) are here so the instructions screen
can show the attempt history **without starting an attempt**. They used to come
only from `POST /lectures/:id/quiz-attempts`, which creates a row on every
call — so reading the attempt count incremented it. `bestScore` is `null`
before the first submitted attempt. For a guest preview both read `0` / `null`.

### 4.4 The locked-lecture contract

```jsonc
// 403 from GET /courses/:slug/lectures/:lectureId and POST /lectures/:id/progress
{ "status": 403, "code": "PREVIOUS_LECTURE_INCOMPLETE",
  "requiredLectureId": "uuid" }
```

Send the student to `requiredLectureId`. A lecture with
`requiresCompletion: false` is optional: it does not count toward
`progressPct` and does not block what follows it, but it still sits in the
reading order.

### 4.5 Progress and completion

- `POST /lectures/:id/progress` with `{ status: 'completed' }` is the single
  trigger for everything downstream: it recomputes `progressPct` over the
  **required** lectures only, promotes `enrolled → in_progress`, and at 100%
  sets `completed`, stamps `completedAt` and issues the certificate.
- The response `{ progressPct, enrollmentStatus }` drives the completion
  toast — when `enrollmentStatus === 'completed'`, redirect to `STU_CER_10`.
- Completion is idempotent: re-posting `completed` never moves `completedAt`
  and never mints a second certificate.
- **Returns `200`, not `201`** (4.2 D10). It is an upsert of a row the client
  never addresses by id, so there is no created resource to point at.
- `PUT /lectures/:id/watch-position` deliberately does **not** recompute
  progress, so it is safe on a 15s throttle. Body: `{ watchDurationSecs }`.
- Quiz and reflection lectures fire progress **server-side** on a passing
  submit. Posting `completed` yourself afterwards is harmless but redundant.

**The lecture progress state machine (4.2 D7).** `not_started → in_progress →
completed`, one way. A request to move a lecture to a *lower* status is
accepted and ignored: `200`, `progressPct` unchanged, `watchDurationSecs` still
written. The player pings `in_progress` whenever a lecture is opened, and
honouring that over a stored `completed` dropped the percentage, demoted the
enrolment, hid the student's certificate and re-locked every later lecture on a
sequential course. "Completion is idempotent" only ever covered re-posting the
*same* status; the demotion path was undefined, and that is where the defect
came from.

**An issued certificate is never withdrawn (4.2 D8).** Once a certificate
exists, `GET /enrollments/:id/certificate` returns `ready: true` for the life
of the enrolment. `enrollments.status` does not leave `completed` and
`completedAt` is stamped once, ever. `progressPct` **may** fall below 100 — an
admin adding a required lecture to a published course is the normal way — and
that is reported honestly without affecting the certificate.

### 4.6 Quiz — starting an attempt

`POST /lectures/:lectureId/quiz-attempts` → `201`

```jsonc
{
  "attemptId": "uuid",
  "passThresholdPercent": 70,        // show as "Pass threshold"
  "passingScore": 50,                // legacy, deprecated — do not display
  "instructions": "Read carefully",
  "timeLimitSecs": null,             // null ⇒ hide the timer entirely
  "previousAttempts": 2,             // retries are unlimited; no gate
  "bestScore": 80,                   // MAX over submitted attempts; null if none
  "resumedAnswers": { "q1": ["opt-1"] },  // null when there is no draft
  "questions": [
    {
      "id": "uuid", "questionText": "Pick one", "questionType": "multiple_choice",
      "isRequired": true, "displayOrder": 1,
      "minWordCount": null,
      "ratingMin": null, "ratingMax": null,
      "ratingLabelMin": null, "ratingLabelMax": null,
      "allowedMimeTypes": null, "maxFileSizeMb": null,
      "options": [ { "id": "uuid", "optionText": "A", "displayOrder": 1 } ]
    }
  ]
}
```

**What is deliberately absent.** `options[].isCorrect` and
`questions[].explanation` are answer-key material and are stripped from this
payload and from every resume payload. If you ever see either field before a
submit, that is a bug — report it, do not build on it.

Each start creates a fresh attempt row, so calling this again *is* the Retry
action.

### 4.7 Quiz — submitting

`POST /quiz-attempts/:id/submit` → `200`

```jsonc
// request
{ "answers": [
  { "questionId": "uuid", "selectedOptionIds": ["uuid"] },
  { "questionId": "uuid", "textAnswer": "My essay" },
  { "questionId": "uuid", "ratingAnswer": 4 },
  { "questionId": "uuid", "fileId": "uuid" }
] }
```

```jsonc
// response — QuizResultDto
{
  "attemptId": "uuid",
  "score": 80,
  "passed": true,                    // ALWAYS a boolean. Never null.
  "passThresholdPercent": 70,
  "passingScore": 50,                // legacy
  "nextLectureId": "uuid",           // null at the end of the course
  "feedback": [
    {
      "questionId": "uuid",
      "isCorrect": false,            // true only at full marks
      "score": 50,                   // this question's percentage, 0-100
      "autoPassed": false,           // full marks with no answer key
      "correctSelected": 1,          // the x of the x/y partial-credit chip
      "totalCorrect": 2,             // the y
      "correctOptionIds": ["uuid"],
      "explanation": "Because …"     // v2.3 — null ⇒ render no box
    }
  ]
}
```

**The branch is two-way, not three.** `passed: true` → toast, then navigate to
`nextLectureId`. `passed: false` → inline `<QuizFailReviewPanel />` on the same
screen with an unlimited Retry. There is no awaiting-review state and no
`passed: null`; if you have code handling that, delete it.

Errors: `403 notYourAttempt` · `409 ATTEMPT_ALREADY_SUBMITTED` ·
`422 { lecture: 'notAQuiz' }`.

### 4.8 Quiz — how the score is computed

The FE does not need to reproduce this, but the fail panel has to explain it,
so here is the whole rule (§2.4).

| Question type | Scoring |
|---|---|
| `multiple_choice`, `true_false` | All-or-nothing: the selection must equal the answer key exactly |
| `multiple_select` | **Partial credit** — `clamp((correctSelected − wrongSelected) / totalCorrect, 0, 1)` |
| `essay`, `short_answer` | Auto-pass at full marks if the text is non-empty after trim |
| `file_upload` | Auto-pass at full marks if a `fileId` is present |
| `rating_scale` | Auto-pass at full marks if the value sits within `[ratingMin, ratingMax]` |

Total: `Σ(questionScore × weight) / Σ(weight) × 100`, rounded, with every
weight currently 1. `passed = score >= passThresholdPercent`.

Three things that follow, and that the UI should say out loud:

- **Selecting every option on a `multiple_select` scores zero**, not partial
  credit. That is what the clamp is for.
- **Auto-passed questions still count in the denominator.** Leaving an essay
  blank costs its full share of the score — it does not simply drop out. Show
  the "Not scored — will auto-pass on any answer" chip so students understand
  that answering it at all is what earns the marks.
- **An unanswered question scores zero**, it is never skipped.

### 4.9 Quiz — review

`GET /quiz-attempts/:id/review` → `200` (note the `/review` suffix — §4.1)

```jsonc
// before submission — nothing is revealed
{ "attemptId": "uuid", "score": null, "passed": null,
  "submittedAt": null, "review": null }

// after submission
{
  "attemptId": "uuid", "score": 50, "passed": false,
  "submittedAt": "2026-09-05T10:00:00.000Z",
  "review": [
    {
      "questionId": "uuid",
      "selectedOptionIds": ["uuid"],
      "correctOptionIds": ["uuid"],
      "textAnswer": null, "ratingAnswer": null,
      "isCorrect": false,
      "score": 50,
      "explanation": "Because …"     // v2.3 — null ⇒ render no box
    }
  ]
}
```

`review: null` is the marker that this attempt has not been submitted; it is
not an empty state to render.

### 4.10 Quiz — answer file upload

`POST /quiz-attempts/:id/answers/:questionId/file` — `multipart/form-data`,
field name `file`. Returns `{ fileId, path }`; send `fileId` back as
`answers[].fileId` on submit.

Validated server-side in this order:

| Check | Failure |
|---|---|
| Attempt belongs to the caller | `403 notYourAttempt` |
| Attempt not yet submitted | `409 ATTEMPT_ALREADY_SUBMITTED` |
| Question belongs to that attempt's lecture | `404 questionNotFound` |
| `questionType === 'file_upload'` | `422 notAFileUploadQuestion` |
| MIME type in the question's `allowedMimeTypes` | `422 cantUploadFileType` |
| Size within `maxFileSizeMb`, and under 50 MB absolute | `422 fileTooLarge` |

`allowedMimeTypes` is a comma-separated list and accepts `type/*` wildcards;
`null` means the question takes any type. Both chips on the dropzone come
straight from the question object in §4.6.

A body over the **50 MB** hard cap is cut off mid-stream by multer and comes
back as `413`, not `422` — handle both. PDFs, DOCX and any other type the
question allows are accepted (v2.2 replaced the image-only filter that used to
reject them before the handler ran).

Under a **presigned** file driver the server never receives the bytes, so this
route returns `501 { errors: { file: 'uploadNotSupportedByFileDriver' } }` and
the presigned flow (deferred to V1.1, §7 Q14) is needed instead.

### 4.11 Reflection

```jsonc
// GET /lectures/:lectureId/reflection-responses
{
  "minResponseLength": 10,          // words, from REFLECTION_MIN_WORDS
  "questions": [
    { "id": "uuid", "questionText": "What did you learn?", "displayOrder": 1,
      "responseText": "…",           // null when unanswered
      "submittedAt": null }          // null while still a draft
  ]
}
```

```jsonc
// POST /lectures/:lectureId/reflection-responses
{ "isDraft": false, "answers": [ { "questionId": "uuid", "responseText": "…" } ] }
```

- `isDraft: true` → `{ saved: true }`. Skips the word count, saves whatever is
  typed, does **not** complete the lecture.
- `isDraft: false` → requires **every** question to be present and to meet
  `minResponseLength`, then completes the lecture and returns
  `{ progressPct, enrollmentStatus }`.
- The minimum is **global**, from `REFLECTION_MIN_WORDS` — it is no longer per
  lecture. Read it from this response rather than hardcoding 10, and use it for
  the live counter so client and server agree.
- Words are whitespace-separated, which is the correct unit for Vietnamese too.
- Too short: `422 { errors: { answers: "tooShort:<questionId>", minResponseLength: 10 } }`.
  Missing a question: `422 { errors: { answers: "missingQuestion:<questionId>" } }`.

### 4.12 Enrolment: rate limit and idempotency

- `POST /courses/:slug/enroll` allows **5 calls a minute per user**; over that
  it returns `429 { code: 'RATE_LIMITED', retryAfterSecs }`. The counter lives
  in the API process, so behind N replicas the real budget is 5 × N — an abuse
  guard, not a quota.
- Sending an `Idempotency-Key` header (any opaque string) makes a retry safe: a
  student who is already enrolled gets `201 { enrollmentId, message: 'Already
  enrolled' }` instead of `409 ALREADY_ENROLLED`. Without the header the 409
  still fires, so existing behaviour is unchanged.
- A **cancelled** enrolment no longer blocks a new one — that is what the
  "Re-enroll" CTA in §5.3 needs.

### 4.13 Completion, certificate, rating, career reflection

```jsonc
// GET /enrollments/:id/certificate
{ "ready": true,
  "certificate": {
    "id": "uuid", "number": "DNA-2026-000123",
    "studentName": "…", "courseTitle": "…",
    "completionDate": "2026-09-05T…", "issuedAt": "2026-09-05T…",
    "fileUrl": null } }
```

`fileUrl` is always `null` in V1 — render the certificate client-side from
`number`, `studentName`, `courseTitle` and `completionDate`. `ready: false`
means the course is not complete yet and `certificate` is absent.

```jsonc
// GET | POST | PUT /enrollments/:id/rating          POST and PUT both upsert
{ "rating": 5, "reviewText": "…", "reviewStatus": "pending",
  "submittedAt": "2026-09-05T…" }
```

One rating per enrolment, enforced by a unique constraint, editable at any
time after completion. Review **text** sets `reviewStatus: 'pending'`; a bare
star rating is `approved` immediately because there is nothing to moderate.
Writing a rating refreshes `course.avgRating`.

```jsonc
// GET /career-reflection-questions/grouped?courseId=<uuid>     (public)
{ "interest": [ { "id": "uuid", "questionText": "…", "displayOrder": 1,
                  "category": "interest" } ],
  "uncategorized": [ … ] }

// GET  /enrollments/:id/career-reflection
[ { "questionId": "uuid", "textAnswer": "…", "ratingAnswer": null,
    "submittedAt": "2026-09-05T…" } ]

// POST /enrollments/:id/career-reflection
{ "answers": [ { "questionId": "uuid", "textAnswer": "…", "ratingAnswer": 4 } ] }
```

Course-specific questions and the global ones (`courseId IS NULL`) come back
together. A question with no category lands in the `uncategorized` bucket —
render the buckets in whatever order you need, the keys are not ordered.

`POST` upserts, so it doubles as edit. An unknown question id is
`422 { errors: { answers: "unknownQuestion:<id>" } }`.

### 4.14 Access model — what the FE may call

Every generated CRUD controller for the learning tables used to be reachable by
any logged-in user with no ownership check: a student could read other
students' enrolments and certificates, `PATCH` someone else's
`lecture_progress` to `completed`, or `GET /quiz-answer-options` and read the
answer key. All of it is closed.

| Surface | Guard | Who |
|---|---|---|
| `/courses`, `/courses/:slug/preview-lectures/:id`, `/career-reflection-questions/grouped` | none | anyone |
| `/courses/:slug` | optional JWT | anyone; enrolment fields appear with a token |
| `/courses/:slug/enroll`, `/students/me/courses`, `/enrollments/:id/*`, `/courses/:slug/lectures/:id`, `/lectures/:id/*`, `/quiz-attempts/:id/*` | JWT + `OnboardingGuard` + **ownership** | the student who owns the record |
| `/admin/**` | JWT + `PermissionGuard` | a role holding the named permission |
| Generated CRUD (`/enrollments`, `/quiz-attempts`, `/lecture-progresses`, `/certificates`, `/course-ratings`, `/quiz-saves`, `/quiz-questions`, `/quiz-answer-options`, `/reflection-*`, `/career-reflection-*`) | JWT + `PermissionGuard` (`courses:edit`) | admins only — **not for FE use** |
| `/user-roles`, `/role-permissions` | removed | use `PUT /admin/users/:id/roles` and `PUT /admin/roles/:id/permissions` |

Ownership is enforced inside the services, not by a guard: a request for
another student's attempt or enrolment is `403 { code: 'NOT_ENROLLED' }` or
`403 { error: 'notYourAttempt' | 'notYourEnrollment' }`.

**Bootstrapping an admin.** `PermissionGuard` reads the `user_role` table, not
the legacy `user.roleId`. A fresh database is seeded with Super Admin on
`admin@example.com` (password `secret`) so somebody can pass a permission check
on day one; move the role to a real account and the seed stays out of the way.

### 4.15 Error codes — one table for the whole epic

A 403 is never generic here. Branch on `code` / `error`, never on the status
alone.

| Status | Body | What the FE does |
|---|---|---|
| `401` | — | Send to sign-in |
| `403` | `{ code: 'ONBOARDING_REQUIRED' }` | Send to onboarding |
| `403` | `{ code: 'NOT_ENROLLED' }` | Send to the course overview |
| `403` | `{ code: 'PREVIOUS_LECTURE_INCOMPLETE', requiredLectureId }` | Open `requiredLectureId` |
| `403` | `{ error: 'notYourAttempt' \| 'notYourEnrollment' }` | Treat as a bug — the app opened someone else's record |
| `403` | `{ code: 'PERMISSION_DENIED' }` | An admin surface; hide the control |
| `404` | `{ error: 'courseNotFound' \| 'lectureNotFound' \| 'attemptNotFound' \| 'questionNotFound' }` | Not-found state. Draft and unpublished courses are 404, not 403, on purpose |
| `409` | `{ code: 'ALREADY_ENROLLED' }` | Go to the course; or resend with `Idempotency-Key` |
| `409` | `{ code: 'ATTEMPT_ALREADY_SUBMITTED' }` | Start a new attempt |
| `413` | — | File over the 50 MB hard cap |
| `422` | `{ errors: { … } }` | Field-level; see the per-endpoint tables above |
| `429` | `{ code: 'RATE_LIMITED', retryAfterSecs }` | Back off for `retryAfterSecs` |
| `501` | `{ errors: { file: 'uploadNotSupportedByFileDriver' } }` | Presigned driver; upload unsupported in V1 |

### 4.16 Request bodies are whitelisted

The global `ValidationPipe` runs with `whitelist: true`: a key the DTO does not
declare is **silently dropped** before the handler sees it. A typo in a field
name therefore looks like a no-op rather than an error — no 422, no warning,
the value simply never arrives. Match the shapes in this section exactly.

### 4.17 Master data lists are not truncated

`GET /master-data/codes?groupKey=` and the admin
`GET /admin/master-data/groups/:groupKey/codes` were both capped at 50 rows
with no paging control, and `course_level` had already passed 50 on a working
database — so options were silently missing from dropdowns and from the admin
screen that manages them. A `groupKey`-scoped request now returns the whole
group; an unscoped request stays capped at 200.

FE consequence: always pass `groupKey`, and treat the result as complete — no
paging loop needed.

### 4.18 Catalog query parameters

`GET /courses` — every parameter is optional and they combine with AND.

`sortBy`: `newest` (default) `| most_popular | highest_rated | shortest |
longest`. Duration filters (`minDurationSecs`, `maxDurationSecs`) are in
**seconds**. Search matches course title and description plus primary and
co-instructor names **and** headlines.

## Section 5 — Screen-by-screen Instructions

For each screen below: **KEEP** = already implemented correctly; **MODIFY** = needs change; **ADD** = missing entirely. FE + BE + API integration listed together for context.

### 5.1 `STU_CAT_03` Course Catalog

**Existing implementation (`browse_courses.html`) — KEEP**
- 3-column card grid with tag / level / rating / title / description / instructor / duration / student count
- Filter sidebar with placeholder Category / Level / Price / Duration / Rating headers
- Search input, pagination `1 2 3 4 5`
- Header controls (language icon, dark mode, hamburger)

**MODIFY**
- **Filter sidebar controls (currently missing bodies):** add real inputs for Language dropdown, Course Group multi-select, Instructor combobox, Career field, Duration slider or preset chips (0-2h / 2-6h / 6h+), Price range slider + Free/Paid toggle, Certificate checkbox
- **Sort dropdown** above grid: `newest | most_popular | highest_rated | shortest | longest`
- **Course card:** replace instructor plain text with `primaryInstructor.fullName` + "+N others" chip; add `Free`/`$XX` price badge; add `Enrolled` overlay when student already enrolled; add `▶ Preview` icon when any lecture `is_preview=true`
- **Header:** wire language switcher (EPIC 6) — currently only an icon
- Add **result count line** ("312 courses found") above grid using `totalCount`
- Add **loading skeleton** (6 cards) on filter change
- Add **empty state** panel when `totalCount === 0`
- **Localize** all master-data-derived labels via `localizedName(item, currentLocale)`

**BE**
- Endpoint: `GET /api/v1/courses` — see §2.2 for changes (new filters, new response fields, EPIC 5 + EPIC 6 hookup)

**FE components to add**
- `<FilterSidebar />` with sub-widgets: `<LanguageFilter />`, `<GroupMultiSelect />`, `<InstructorCombobox />`, `<CareerFieldMultiSelect />`, `<DurationSlider />`, `<PriceRange />`, `<CertificateFilter />`
- `<SortDropdown />`
- `<CourseCard />` with `primaryInstructor`, `enrolled` overlay, `preview` badge, price badge
- `<ResultCount />`
- `<CatalogSkeleton />`, `<CatalogEmpty />`

---

### 5.2 `STU_OVR_04` Course Overview

**Existing implementation (`course_overview.html`) — KEEP**
- Breadcrumb, category + level tags, title, description
- Instructor block (name + role)
- Star rating + review count
- Meta grid (Duration, Modules, Hands-on, Certificate)
- Tabs (Curriculum / Overview / Reviews / FAQ) with curriculum accordion + lock icons
- Sticky right sidebar with Enroll CTA

**MODIFY**
- Add **thumbnail hero image** (`courses.thumbnail_url`)
- Add **intro/preview video** (`courses.intro_video_url`) — YouTube embed near CTA
- Add **Learning Outcomes** section (required by AC)
- Add **Requirements** section (required by AC)
- Add **Target Learners** section (required by AC)
- Add **Language badge** in meta bar
- Instructor block → replace with `<InstructorCard />` from EPIC 5 (avatar + headline + bio short + social); render **co-instructors** below primary; clicking opens `<InstructorProfileDrawer />`
- **CTA state machine — 6 variants:** `sign_in_to_enroll` / `complete_profile_to_enroll` / `enroll_now` / `start_learning` / `continue_learning` / `enrollment_closed` (disabled)
- Preview modal — clicking a preview-marked lecture opens `<PreviewLectureModal />` with the same content the player shows (no progress writes)
- **v2.2: curriculum tick marks from server.** Sidebar reads `curriculum[].lectures[].progressStatus` (`completed` = green tick, `in_progress` = half chip, `not_started` = empty, `null` = guest). Do **not** compute from client-session state — a reload used to lose ticks. `isLocked` renders lock icon + tooltip with `lockReason`. `watchDurationSecs > 0` on a video lecture renders a "Resume" chip.
- **Sequential completion notice** ("Complete lectures in order to unlock the next") when `requires_sequential_completion=true`
- Expand-all / Collapse-all curriculum toggle
- **Reviews tab** — implement paginated list of approved `course_ratings`
- **FAQ tab** — hide or drop (no schema)
- Remove "30-day money-back guarantee" copy if only free courses supported in V1
- Localize all labels

**BE**
- Endpoint: `GET /api/v1/courses/:slug` — see §2.2 changes
- New: `GET /courses/:slug/preview-lectures/:lectureId` for preview modal

**FE components to add**
- `<LearningOutcomesList />`, `<RequirementsList />`, `<TargetLearnersList />`
- `<PreviewLectureModal />`
- `<EnrollCTA />` with 6 states
- `<SequentialCompletionNotice />`
- `<ReviewsTab />` with pagination
- `<InstructorCard />`, `<InstructorProfileDrawer />` (from EPIC 5)

---

### 5.3 `STU_MYC_05` My Courses

**Existing implementation (`my_learning_dashboard.html`) — KEEP**
- Header "My Courses" + subtitle
- Card list (2 cols) with tag, title, description, progress bar, "Continue Learning" CTA
- Tabs: In Progress / Completed

**MODIFY**
- **Course thumbnail** on every card (`courseThumbnailUrl`)
- **Enrollment date** label ("Enrolled Jan 5, 2026")
- **Last accessed lecture** on EVERY card (currently only 1 has it); empty-state text "Not started yet" when null
- **Status badge**: `Not Started` (blue) / `In Progress` (green) / `Completed` (gray)
- **CTA by status**: `Start Learning` when `status='enrolled'`, `Continue Learning` when `in_progress`, `View Certificate` + download shortcut when `completed`
- Add **All tab** (default) with counts, plus In Progress and Completed
- Add **empty state** ("You haven't enrolled in any course yet — Browse Catalog")
- Handle **archived** state (course unpublished after enrollment) — small "Archived" chip + disable Continue
- Handle **cancelled** state — "Cancelled" chip + "Re-enroll" CTA
- Optional: sort dropdown (by date / progress / group)

**BE**
- Endpoint: `GET /api/v1/students/me/courses` — see §2.2 for added fields (`certificateId`, `completedAt`, `lastLectureTitle`, `courseThumbnailUrl`)

**FE components to add**
- `<EnrollmentCard />` variants for each status
- `<MyCoursesEmpty />`
- `<StatusBadge />` reusable
- `<CertificateShortcutButton />`

---

### 5.4 `STU_PLV_06` Course Player · Video (`player_video.html`)

**KEEP ✅**
- Header with progress ring + expand dropdown
- YouTube iframe (`youtube.com/embed/{video_id}`)
- Toolbar: Previous / Mark as Complete / Auto-completion active / Next
- Sidebar with sections + lecture types + active state
- "Progress Saved automatically" indicator
- Instructor block
- Report an issue link

**MODIFY 🔧**
- YouTube video ID currently hard-coded `dQw4w9WgXcQ` — bind from `lecture_content_video.youtube_video_id`
- Instructor block: replace with EPIC 5's `<InstructorCard />`
- Sidebar `0/5 Completed` — sync from real data (from `curriculum[].lectures[].progressStatus`, v2.2 §5.2)
- **v2.2: Notes / Q&A / Resources tabs — HIDE V1.** No backing endpoints; visible tabs promise features that do not exist. Do not render disabled tabs (creates "why can't I click" confusion). Deferred to V2 backlog.
- **v2.2: "Report an issue" link** — swap current placeholder anchor for `<ReportIssueLink />` (mailto).

**ADD ❌**
- **v2.2: Lecture description block** below the video title — render `<LectureDescriptionBlock />` from `lecture.description`; hide if null. Never use `course.shortDescription`. (New element — mockup has no equivalent today.)
- **YouTube Player API integration** — listen for `PlayerState.ENDED`; on ended → `POST /lectures/:id/progress { status: 'completed' }`
- **Resume from last position** — on mount, if `lecture_progress.watch_duration_secs > 0`, call `player.seekTo(secs)`
- **Watch-position ping** — throttled 15s `PUT /lectures/:id/watch-position`
- **Error state** — YouTube video private/removed → placeholder card + retry
- **Language switcher** in header (EPIC 6)
- **Completion status chip** on toolbar (`✓ Completed` when done)
- **Locked lecture click behavior** in sidebar — clicking a locked row shows tooltip/toast explaining prerequisite
- **Preview badge** on sidebar rows where `is_preview=true`
- **Course completion flow** — when last required lecture completes → toast "🎉 Course completed!" → redirect to `STU_CER_10`

**FE components to add**
- `<YouTubePlayerWrapper />` — wraps iframe, exposes `onEnded`, `seekTo`, `getCurrentTime`
- `<LectureErrorState />`
- `<CompletionToast />`

**BE**
- `GET /courses/:slug/lectures/:lectureId` returns `{ lectureType, contentPayload: { youtubeVideoId }, prevLectureId, nextLectureId, isLocked, lockReason, progressStatus, watchDurationSecs }`
- `POST /lectures/:id/progress` — marks completion, triggers `CompletionDetectorService`
- `PUT /lectures/:id/watch-position`

**API integration**
| Surface | Method | Endpoint | Body |
|---|---|---|---|
| Load video lecture | `GET` | `/courses/:slug/lectures/:lectureId` | — |
| On play start | `POST` | `/lectures/:id/progress` | `{ status: 'in_progress' }` |
| On ended | `POST` | `/lectures/:id/progress` | `{ status: 'completed', watchDurationSecs }` |
| Throttled position | `PUT` | `/lectures/:id/watch-position` | `{ watchDurationSecs }` |

---

### 5.5 `STU_PLA_07` Course Player · Article/PDF (`player_article_pdf.html`)

**KEEP ✅**
- Custom PDF toolbar (page nav, zoom, fullscreen)
- File info card (filename, size)
- Sidebar
- Instructor block
- Timer text "Auto-complete in 5s"
- "In Progress" status badge
- Report an issue link

**MODIFY 🔧**
- Toolbar's Download button currently always visible — **hide entirely when `is_downloadable=false`**
- Instructor block → EPIC 5's `<InstructorCard />`
- **v2.2: HIDE Notes / Q&A / Resources tabs** including the count chips (`Q&A (12)`, `Resources (3)` in mockup). No backing endpoints exist. Deferred to V2 backlog. Do not disable — remove from render.
- **v2.2: Article description block** — render `<LectureDescriptionBlock />` reading `lecture.description` (nullable) directly below the lecture title on article mode. Hide when null. **MUST NOT** substitute `course.shortDescription` — that made every lecture in a course display the same paragraph.
- **v2.2: Page counter** — PDF.js exposes `pdfDocument.numPages` client-side; render `Page {current} / {numPages}` from the PDF.js instance directly. No BE field needed (v2.2 explicitly does NOT add `pageCount` / `sizeBytes` to the payload).
- **v2.2: File info card — drop the size chip.** Mockup shows filename + size; keep filename only. `sizeBytes` is not part of the payload and PDF.js does not report file size — do not compute or fake one.
- **v2.2: "Report an issue" link** — swap for `<ReportIssueLink />` (mailto).

**ADD ❌**
- **Real PDF.js integration** (currently only placeholder text "Rendering document pages…") — see design spec §1.2; render inline with dark-themed canvas
- **Article renderer branch** — currently only PDF is handled; needs a separate render path for `lecture_type='article'` that displays `lecture_content_article.body` as rich text
- **`<ReadingControlBar />`** for article mode: font-size A- / A / A+, line-height, theme (Dark / Sepia / Light), print
- **Auto-generated TOC** from article H2/H3 headings (sticky right rail)
- **Code block copy button** in article
- **Dwell timer** — implement real 5s countdown gated on:
  - Article: tab active (Page Visibility API) + at least one scroll/click
  - PDF: at least one visible page + at least one interaction
- **Anti-download hardening** when `is_downloadable=false`: disable right-click on canvas, intercept `Ctrl+S`/`Cmd+S`
- **Search-in-doc** for PDF (PDF.js `findController`)
- **Loading skeleton** (page frames) instead of text placeholder
- **Error state** — "Cannot load PDF — [Retry]" when R2 fails
- **`<MarkCompleteButton />`** — allow manual complete before 5s
- **`<LectureNavigationBar />`** — Previous / status chip / Next
- **Locked lecture message** for sequential mode
- **Mobile responsive** — PDF single-page swipe mode

**FE components to add**
- `<PDFRenderer />` (PDF.js inline)
- `<ArticleRenderer />` (rich-text renderer + TOC + copy-code buttons)
- `<ReadingControlBar />`
- `<DwellTimerBadge />`
- `<ContentLoadingSkeleton />`, `<ContentErrorState />`

**BE**
- `GET /courses/:slug/lectures/:lectureId` returns:
  - When `lecture_type='article'`: `contentPayload: { bodyHtml }`
  - When `lecture_type='pdf_document'`: `contentPayload: { fileUrl, fileName, isDownloadable }`
  - **v2.2:** top-level `description: string | null` on `LectureViewDto` (from `lectures.description`)
- Ensure article HTML is sanitized server-side (DOMPurify equivalent)
- **v2.2: `sizeBytes` and `pageCount` are NOT part of the payload.** PDF.js reads `numPages` client-side; file size is not shown in v2.2.

**API integration**
| Surface | Method | Endpoint | Body |
|---|---|---|---|
| Load article/PDF | `GET` | `/courses/:slug/lectures/:lectureId` | — |
| On content loaded | `POST` | `/lectures/:id/progress` | `{ status: 'in_progress' }` |
| Dwell timer hits 0 | `POST` | `/lectures/:id/progress` | `{ status: 'completed' }` |
| Manual mark | `POST` | `/lectures/:id/progress` | `{ status: 'completed' }` |

---

### 5.6 `STU_PLQ_08` Course Player · Quiz (`player_quiz.html`)

**KEEP ✅**
- Progress bar `Q 3 of 10`, 30%
- Timer 12:34
- Save & Exit button
- Question Map (Answered / Current / Flagged / Unanswered legend)
- Auto-saved chip
- Previous / Flag for review / Next buttons
- Sidebar

**MODIFY 🔧**
- Current single question renderer only supports **multi-select** — refactor into a `<QuestionRenderer />` router by `question_type` (see ADD)
- Auto-saved chip → replace static text with `<AutoSaveIndicator />` with 3 states
- Timer — connect to real `lecture_content_quiz.time_limit_secs` (new column); when NULL, hide timer entirely
- "Save & Exit" — implement real behavior: `PUT /lectures/:id/quiz-save` then redirect back
- **Instructions screen threshold field** — read `pass_threshold_percent` from lecture payload (not the legacy `passing_score`). Best-score line reads from the highest of prior `quiz_attempts.score_percent`.
- **v2.2: HIDE Notes / Q&A / Resources tabs** if drawn in the mockup. No backing endpoints — remove from render, do not disable.
- **v2.2: "Report an issue" link** — use shared `<ReportIssueLink />` (mailto).

**ADD ❌ — additional screens (state machine, v2.1)**

- **v2.2: Lecture description block** — render `<LectureDescriptionBlock />` from `lecture.description` on the Instructions screen only (before Start Quiz). Hide if null. Never fall back to `course.shortDescription`.
- **Instructions Screen** — before Start Quiz; shows `lecture_content_quiz.instructions`, question count, **`pass_threshold_percent`** (labeled "Pass threshold"), best previous score (`MAX(score_percent)` from prior `quiz_attempts`), attempts count (unlimited), resume banner (if `quiz_saves` exists)
- **Submit Confirmation Modal** — summary + warning for unanswered required questions
- **Pass path (no new screen)** — `<QuizPassToast />` "Passed! Score {X}% · Threshold {Y}%" for 2s, then auto-navigate to `nextLectureId`. No manual result screen.
- **Fail path (inline review, same screen)** — `<QuizFailReviewPanel />` replaces the answering area:
  - Red banner: **"Not passed. Score {X}% / Threshold {Y}%. Try again."**
  - Per-question ✗ markers with correct answer revealed, plus explanation from `quiz_questions.explanation` (new nullable column, §2.1 v2.3) — hide the box entirely when NULL
  - **[Retry]** → reset local answers, back to `in_progress` mode, `attempt_no` will increment on next submit
  - **[Back to course]** → return to `STU_OVR_04`
- **No awaiting-review view** — v2.1 removed manual grading. Essay / file_upload auto-pass on non-empty content and contribute full marks; the score gate applies to objective questions only.

**ADD ❌ — missing question types (5 of 6)**
- `<RadioGroupQuestion />` for `multiple_choice`
- `<TrueFalseQuestion />` for `true_false` (2 big buttons)
- `<EssayQuestion />` for `essay` (textarea + live word count vs `min_word_count`)
- `<RatingScaleQuestion />` for `rating_scale` (slider `rating_min`–`rating_max`, labels `rating_label_min` / `rating_label_max`)
- `<FileUploadQuestion />` for `file_upload` (dropzone + `allowed_mime_types` chip + `max_file_size_mb` chip + upload progress)

**ADD ❌ — other**
- **Required-question marker** (asterisk) on question header
- **Question-type icon** in question header
- **Warning modal for unanswered required questions** before submit
- **Auto-save every 30s** to `quiz_saves`
- **Retry (unlimited)** — Retry button on inline fail-review panel calls `POST /lectures/:id/quiz-attempts` again; no attempt-limit gate
- **Partial credit visualization** for `multiple_select` in fail-review — show `x / total_correct` chip per question (matches BE partial-credit formula, §2.4)
- **Auto-pass hint** on essay / file_upload / short_answer / rating_scale question headers — small muted chip "Not scored — will auto-pass on any answer"
- **Explanation reveal gating (v2.3)** — `quiz_questions.explanation` rides the `is_correct` secrecy rules: MUST NOT appear in start-attempt / resume payloads; only submit response and post-submit review carry it, per question, only when authored (non-NULL)

**FE components to add** (see design spec Section 5.2 for full list; 15+ components)

**BE**
- `POST /lectures/:id/quiz-attempts` — start
- `PUT /lectures/:id/quiz-save` — draft
- `POST /quiz-attempts/:id/submit` — auto-grade + queue manual
- `GET /quiz-attempts/:id` — detail + review
- `POST /quiz-attempts/:id/answers/:qid/file` — R2 upload

**API integration**
| Surface | Method | Endpoint | Body |
|---|---|---|---|
| Start attempt | `POST` | `/lectures/:id/quiz-attempts` | — |
| Resume | `GET` | `/lectures/:id/quiz-save` | — |
| Auto-save | `PUT` | `/lectures/:id/quiz-save` | `{ answersJson }` |
| Submit | `POST` | `/quiz-attempts/:id/submit` | — |
| Review | `GET` | `/quiz-attempts/:id` | — |
| Upload file | `POST` | `/quiz-attempts/:id/answers/:qid/file` | multipart |
| Mark complete on pass | `POST` | `/lectures/:id/progress` | `{ status: 'completed' }` (BE may also fire this internally on pass) |

---

### 5.7 `STU_PLR_09` Course Player · Reflection (`player_reflection.html`)

**KEEP ✅** — this is the most complete of the four
- Icon + title + description
- Notice "Each answer needs at least 50 words"
- Question cards with number chip
- Live word counter with warning chip
- Auto-saved indicator per card
- Submit button with disabled tooltip
- Progress "0 / 3 questions completed"
- Sidebar + Instructor block

**MODIFY 🔧**
- Auto-saved chip → use shared `<AutoSaveIndicator />`
- Instructor block → EPIC 5's `<InstructorCard />`
- **v2.2: HIDE Notes / Q&A / Resources tabs** if drawn in the mockup. No backing endpoints — remove from render, do not disable.
- **v2.2: Bind the existing description block to `lecture.description`** — the KEEP-list "Icon + title + description" is a hardcoded intro paragraph in the mockup. Replace it with `<LectureDescriptionBlock />` reading `lecture.description`. Hide when null; do not fall back to `course.shortDescription`.
- **v2.2: Reflection min-words notice** — the mockup hardcodes "50 words". Bind label to env-configured `REFLECTION_MIN_WORDS` (default 10, §2.4.1). Never render a stale hardcoded number.
- **v2.2: "Report an issue" link** — use shared `<ReportIssueLink />` (mailto).

**ADD ❌**
- **Save Draft** secondary CTA (distinct from Submit) — persists via `POST /lectures/:id/reflection-responses` with status flag or draft endpoint
- **Cancel / Back** button
- **Completed state (read-only)** — after submit, show answers as read-only; `Edit Response` button if policy allows; `Continue to Next Lecture` CTA
- **Vietnamese-aware word count** — split via a VI tokenizer (or word-boundary regex, not just space) when `locale === 'vi'`
- **Character counter (optional)** — small, muted, right corner
- **Max length cap** (~5000 words) — prevent perf issue
- **Estimated time chip** ("~10 minutes")
- **Privacy note** in intro ("Your reflections are private and shared only with instructors")
- **Focus state** — bright brand-500 border on textarea focus
- **Language switcher** in header

**FE components to add**
- `<ReflectionCompletedState />`
- `<WordCounter />` locale-aware
- Update `<ReflectionSubmitBar />` to include Save Draft + Cancel

**BE**
- `POST /lectures/:id/reflection-responses` — validate `min_response_length` server-side; upsert per `question_id`; on all-questions-satisfied → mark lecture complete
- `GET /lectures/:id/reflection-responses` — return existing responses

**API integration**
| Surface | Method | Endpoint | Body |
|---|---|---|---|
| Load questions + existing responses | `GET` | `/lectures/:id/reflection-responses` | — |
| Auto-save (per keystroke, debounced 2s) | `POST` | `/lectures/:id/reflection-responses` | `{ questionId, responseText, isDraft: true }` |
| Submit | `POST` | `/lectures/:id/reflection-responses` | `{ answers: [...], isDraft: false }` |
| Mark complete on submit | `POST` | `/lectures/:id/progress` | `{ status: 'completed' }` (BE fires internally) |

---

### 5.8 ~~`ADM_GRD_01` Instructor Grading Queue~~ — **REMOVED in v2.1**

The manual grading queue was removed together with the `passed: null` branch
(see §2.4). Rationale:

- Essay / file_upload / short_answer / rating_scale questions **auto-pass** on
  any non-empty answer. They contribute full marks to `score_percent` so they
  never block completion.
- Objective questions (`multiple_choice`, `true_false`, `multiple_select`)
  are auto-graded — `multiple_select` with partial credit.
- A quiz submit therefore always resolves synchronously to `passed=true` (→
  auto-advance) or `passed=false` (→ inline retry). No reviewer, no queue,
  no `pending_review` status.

The admin endpoints `GET /admin/quiz-attempts/pending` and
`POST /admin/quiz-attempts/:id/grade` become dead code — BE may delete them
or keep them behind a feature flag; either is acceptable, no FE calls them.

**Admin quiz curriculum picker (`ADM_CUR_15`)** — add a **Pass threshold (%)**
number input (0–100, default from env `QUIZ_PASS_THRESHOLD_DEFAULT`) on the
quiz lecture editor. Persists to `lecture_content_quiz.pass_threshold_percent`.

**Quiz question editor (v2.3)** — add an optional **Explanation** textarea per
question, label "Shown to students only after they submit". Plain text with
line breaks preserved; render escaped (no HTML). Persists to
`quiz_questions.explanation`.

---

## Section 6 — Cross-cutting Additions (apply to all 4 player screens)

Handle in shared components / global state, not per screen:

- **`<LanguageSwitcher />`** wired to `useLocaleStore` (EPIC 6)
- **`<InstructorCard />`** used consistently across `STU_OVR_04` and all 4 player screens (EPIC 5)
- **`<AccessDeniedState />`** used when a locked lecture is opened
- **`<PreviewLectureModal />`** used from `STU_OVR_04`, `STU_CAT_03` (from preview badge click)
- **`<EnrollmentSuccessToast />`** fired after `POST /enroll` 201
- **`<CompletionToast />`** fired when `CompletionDetectorService` returns `enrollmentStatus='completed'`; auto-redirect to `STU_CER_10` after 3s
- **Mobile responsive** — sidebar becomes a drawer under 768px
- **Keyboard shortcuts** — space (play/pause video), arrows (prev/next lecture), digits 1-9 (select quiz option)
- **Report an issue** (v2.2) — `<ReportIssueLink />` mailto only. No modal, no `POST /content-reports`, no `content_reports` table in V1. See §3.2.

---

## Section 7 — Open Questions (need answers before implementation)

1. **Payment**: V1 free-only? If yes → BE returns `422 { error: 'paid_courses_not_supported' }`; UI hides Enroll on paid cards.
2. **Certificate rendering**: stored PDF via R2 or on-the-fly HTML→PDF, or both? Schema supports both — pick one.
3. **Certificate number format**: `DNA-{YYYY}-{6-digit-sequence}`? Confirm.
4. **Rating editing**: unlimited / N days / once only?
5. **Review moderation**: admin approves each or auto-approve with report flow?
6. **Video completion trigger**: YouTube `ended` (100%) or 90/95% watched? PDF says `ended`.
7. **Article dwell**: 5s per PDF, or scroll-to-end? Keep 5s + interaction gate.
8. ~~**Quiz retake**: unlimited or N attempts? Best score vs latest score for `progress_pct`?~~ **Resolved v2.1**: unlimited retries; best score = `MAX(score_percent)` computed on read (no dedicated column); `progress_pct` is a lecture-count ratio and is unaffected by score.
9. ~~**Notes / Q&A / Resources** tabs: build in V1 or hide until V2?~~ **Resolved v2.2**: hide V1 on all player screens (no backing endpoints); defer to V2 backlog. Tabs must be removed from render, not disabled.
10. **Language switcher V1**: VI + EN only?
11. **Preview lecture endpoint** for guest — return content without any progress tracking?
12. **Quiz timer** feature: ship in V1 (needs `time_limit_secs` column)?
13. ~~**Report an issue**: schema for `content_reports`? Or just email/support link for V1?~~ **Resolved v2.2**: V1 = `mailto:` link (no BE, no table). V2 backlog = optional `content_reports` table + admin queue.
14. **Presigned upload flow** (v2.2 open) — V1 assumes `FILE_DRIVER=local` or `s3-direct` for quiz file uploads. Presigned drivers return `501`. Defer presigned flow (`POST /files/upload-url` → PUT to signed URL → send back `fileId`) to V1.1?
15. **`support@dna.edu` mailbox** (v2.2 open) — confirm final email address for `<ReportIssueLink />` before shipping.

---

## Section 8 — Acceptance Criteria (delta from previous v1)

Everything from the previous Acceptance Criteria Mapping remains valid; below are the additional criteria for the Learning + Completion scope.

| Requirement | Implementation |
|---|---|
| YouTube video ended → mark complete | `onEnded` fires `POST /lectures/:id/progress` |
| Article/PDF viewed > 5s with interaction → mark complete | `<DwellTimerBadge />` gated on Page Visibility + scroll/click |
| PDF download hidden when `is_downloadable=false` | Toolbar hides button + anti-download hardening |
| Sequential completion prevents access to locked lectures | `SequentialLockService` returns 403 with `requiredLectureId` |
| Quiz saves and resumes | `PUT /quiz-save` + resume banner on Instructions |
| Quiz threshold gates completion | `score_percent >= pass_threshold_percent` (per-quiz column, env default) marks lecture complete; below threshold keeps it `in_progress` |
| Quiz pass path is invisible | On pass, 2s toast then auto-navigate to `nextLectureId` — no result screen |
| Quiz fail path stays on the same screen | Inline `<QuizFailReviewPanel />` with per-question feedback and unlimited Retry |
| Essay / file_upload / short_answer / rating_scale auto-pass | Non-empty answer contributes full marks; no reviewer, no queue |
| `multiple_select` uses partial credit | Formula in §2.4; selecting all options scores 0 |
| Reflection requires min word count | Server + client validation, min from env `REFLECTION_MIN_WORDS` (default 10) |
| Course completion triggers certificate | `CompletionDetectorService` + `CertificateGeneratorService` |
| Certificate shows student + course + date + cert number + issuer | Snapshot fields in `certificates` |
| Rating & career reflection form appears after completion | `STU_CER_10` renders forms; endpoints per §2.3 |
| Continue Learning opens last incomplete lecture | Reads `enrollments.last_lecture_id` |
| Sidebar tick marks survive a reload (v2.2) | `GET /courses/:slug` returns `progressStatus` per lecture; FE reads from server, no client-only state |
| Locked lectures render lock icon on overview (v2.2) | `curriculum[].lectures[].isLocked` + `lockReason` populated server-side |
| Notes / Q&A / Resources tabs hidden V1 (v2.2) | Tabs removed from render on all 4 player screens; no disabled state |
| Lecture description shows per-lecture text (v2.2) | Reads `lecture.description`; hides block when null; never falls back to `course.shortDescription` |
| Report an issue is mailto V1 (v2.2) | `<a href="mailto:...">` with prefilled context; no POST, no `content_reports` table |
| Quiz file upload accepts per-question MIME types (v2.2) | Multer filter overridden to accept-all; service enforces `allowedMimeTypes` + `maxFileSizeMb` per question |
| Quiz explanation appears only post-submit (v2.3) | `quiz_questions.explanation` delivered in submit/review feedback only; stripped from start-attempt payload; NULL renders no explanation box |

---

*End of Epic 4 v2.3.*
