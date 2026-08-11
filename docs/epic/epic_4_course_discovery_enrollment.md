# Epic 4 — Course Discovery & Enrollment

## Stack
- **BE**: NestJS (brocoders/nestjs-boilerplate, relational/PostgreSQL variant)
- **FE**: Next.js (brocoders/extensive-react-boilerplate)
- **DB**: PostgreSQL via TypeORM

## DB Tables Involved
- `courses` — published course records
- `course_group_assignments` — M2M course ↔ group
- `course_learning_outcomes`, `course_requirements`, `course_target_learners`
- `sections`, `lectures`
- `enrollments` — student ↔ course enrollment record
- `master_data_code` / `master_data_group` — for filter dropdowns

---

## BE Tasks

### 1. Public Course Catalog

`GET /courses`

Query params (all optional):
- `search` — full-text search on `courses.title`, `courses.short_description`, `courses.full_description`, instructor full_name
- `groupId` — filter by `course_group_assignments.group_id`
- `categoryId` — filter by `courses.category_id`
- `levelId` — filter by `courses.level_id`
- `minPrice`, `maxPrice` — price range
- `isFree` — boolean
- `language` — filter by `courses.language`
- `instructorId` — filter by `courses.instructor_id`
- `minRating` — filter by `courses.avg_rating >= minRating`
- `page`, `limit` — pagination

**Always filter**: `status = 'published'` AND `enrollment_open = true`

**Response per course card:**
```json
{
  "id": "uuid",
  "slug": "course-slug",
  "title": "...",
  "thumbnailUrl": "...",
  "shortDescription": "...",
  "instructorName": "...",
  "level": { "id": "...", "name": "Beginner" },
  "totalDurationSecs": 3600,
  "price": 0,
  "isFree": true,
  "avgRating": 4.5,
  "totalEnrollments": 128
}
```

---

### 2. Course Overview (Public Detail)

`GET /courses/:slug`

Returns full course detail for a published course:
```json
{
  "id": "...",
  "slug": "...",
  "title": "...",
  "shortDescription": "...",
  "fullDescription": "...",
  "thumbnailUrl": "...",
  "introVideoUrl": "...",
  "instructor": { "id": "...", "fullName": "...", "profilePictureUrl": "..." },
  "level": { "id": "...", "name": "..." },
  "language": "vi",
  "totalDurationSecs": 7200,
  "totalSections": 5,
  "totalLectures": 24,
  "price": 0,
  "isFree": true,
  "hasCertificate": true,
  "avgRating": 4.5,
  "learningOutcomes": ["...", "..."],
  "requirements": ["...", "..."],
  "targetLearners": ["...", "..."],
  "curriculum": [
    {
      "id": "section-uuid",
      "title": "Section 1",
      "displayOrder": 1,
      "lectures": [
        {
          "id": "lecture-uuid",
          "title": "Intro",
          "lectureType": "video",
          "durationSecs": 300,
          "isPreview": true,
          "displayOrder": 1
        }
      ]
    }
  ],
  "enrollmentStatus": null  // or "enrolled"/"completed" if JWT provided
}
```

**Curriculum visibility rules:**
- Lectures with `is_preview = false` → include title + type + duration, but no content URLs
- If student is enrolled → mark `isEnrolled: true` in response (check `enrollments` table if JWT provided)

**Optional JWT**: if `Authorization` header present → decode and attach enrollment status

---

### 3. Enrollment

**Generate entity:**
```
npm run generate:resource:relational -- --name Enrollment
npm run add:property:to-relational -- --name Enrollment --property status --kind primitive --type string --isAddToDto false --isOptional false --isNullable false
npm run add:property:to-relational -- --name Enrollment --property enrollmentDate --kind primitive --type Date --isAddToDto false --isOptional false --isNullable false
npm run add:property:to-relational -- --name Enrollment --property enrollmentSource --kind primitive --type string --isAddToDto true --isOptional true --isNullable true
npm run add:property:to-relational -- --name Enrollment --property startedAt --kind primitive --type Date --isAddToDto false --isOptional true --isNullable true
npm run add:property:to-relational -- --name Enrollment --property completedAt --kind primitive --type Date --isAddToDto false --isOptional true --isNullable true
npm run add:property:to-relational -- --name Enrollment --property progressPct --kind primitive --type number --isAddToDto false --isOptional false --isNullable false
npm run add:property:to-relational -- --name Enrollment --property lastAccessedAt --kind primitive --type Date --isAddToDto false --isOptional true --isNullable true
npm run add:property:to-relational -- --name Enrollment --property student --kind reference --type User --referenceType manyToOne --isAddToDto false --isOptional false --isNullable false --shouldAutoLoad false
npm run add:property:to-relational -- --name Enrollment --property course --kind reference --type Course --referenceType manyToOne --isAddToDto false --isOptional false --isNullable false --shouldAutoLoad false
npm run add:property:to-relational -- --name Enrollment --property lastLectureId --kind primitive --type string --isAddToDto false --isOptional true --isNullable true
```

**`POST /courses/:slug/enroll`** (JWT required + OnboardingGuard):
- Check `course.status = 'published'` and `enrollment_open = true`
- Check no existing enrollment for `(student_id, course_id)` → 409 `{ code: 'ALREADY_ENROLLED' }` if exists
- Create `enrollments` row: `status = 'enrolled'`, `enrollment_date = NOW()`, `enrollment_source = 'organic'`
- Increment `courses.total_enrollments`
- Return: `{ enrollmentId, message: 'Enrollment successful' }`

**`GET /students/me/courses`** (JWT required):
- Return all enrollments for current user with:
```json
[{
  "enrollmentId": "...",
  "course": {
    "id": "...", "title": "...", "thumbnailUrl": "...", "slug": "..."
  },
  "enrollmentDate": "...",
  "progressPct": 45.5,
  "lastLectureId": "...",
  "lastLectureTile": "...",
  "status": "in_progress",
  "completedAt": null
}]
```

---

## FE Tasks

### Zustand Stores

#### `useCourseFilterStore`
Manages catalog search/filter state. Synced with URL query params so filters survive page refresh and are shareable via URL.

```ts
interface CourseFilterStore {
  // Filter values
  search: string
  groupIds: string[]
  categoryId: string | null
  levelId: string | null
  isFree: boolean | null          // null = show all
  minPrice: number | null
  maxPrice: number | null
  language: string | null
  instructorId: string | null
  minRating: number | null        // e.g. 3, 4

  // Pagination
  page: number
  limit: number

  // Results
  courses: CourseCard[]
  totalCount: number
  isLoading: boolean
  isEmpty: boolean                // true when totalCount = 0 after a search

  // Actions
  setSearch: (value: string) => void
  setFilter: (key: keyof Filters, value: unknown) => void
  toggleGroupId: (id: string) => void
  clearFilters: () => void
  setPage: (page: number) => void
  fetchCourses: () => Promise<void>  // calls GET /courses with current state
  syncFromUrl: (params: URLSearchParams) => void   // on page mount
  syncToUrl: () => void                            // after every filter change
}
```

**Usage rules:**
- On `/courses` page mount → `syncFromUrl(searchParams)` → `fetchCourses()`
- Every filter change → debounce 300ms → `fetchCourses()` + `syncToUrl()`
- `clearFilters()` resets all filter fields to null/empty + page to 1 + refetches
- Store is **not** reset on unmount (preserve filters when student navigates back)

---

#### `useCourseDetailStore`
Manages state for the course overview page (`/courses/:slug`).

```ts
interface CourseDetailStore {
  course: CourseDetail | null
  isLoading: boolean

  // Enrollment state for current user
  enrollmentStatus: 'not_enrolled' | 'enrolled' | 'in_progress' | 'completed' | null
  enrollmentId: string | null
  isEnrolling: boolean
  enrollError: string | null

  // Curriculum UI
  expandedSectionIds: string[]

  // Actions
  fetchCourse: (slug: string) => Promise<void>
  enroll: (slug: string) => Promise<void>
  toggleSection: (sectionId: string) => void
  expandAllSections: () => void
  collapseAllSections: () => void
  reset: () => void
}
```

**Usage rules:**
- `fetchCourse(slug)` on page mount — passes JWT if available (for `enrollmentStatus`)
- `enroll(slug)` calls `POST /courses/:slug/enroll`:
  - Sets `isEnrolling = true` during request
  - On success → sets `enrollmentStatus = 'enrolled'`, `enrollmentId` from response
  - On 401 → redirect to `/auth/login?redirect=/courses/:slug`
  - On `ONBOARDING_REQUIRED` (403) → redirect to `/onboarding`
  - On `ALREADY_ENROLLED` (409) → set `enrollmentStatus = 'enrolled'` (sync state)
- `reset()` called on unmount

---

#### `useMyCoursesStore`
Manages the student's enrolled courses list page.

```ts
interface MyCoursesStore {
  enrollments: EnrollmentCard[]
  isLoading: boolean
  activeTab: 'all' | 'in_progress' | 'completed'

  // Derived (computed from enrollments)
  filteredEnrollments: EnrollmentCard[]  // filtered by activeTab

  // Actions
  fetchMycourses: () => Promise<void>   // calls GET /students/me/courses
  setActiveTab: (tab: MyCoursesStore['activeTab']) => void
}
```

**Usage rules:**
- `fetchMycourses()` on page mount
- `setActiveTab()` filters `enrollments` client-side (no re-fetch needed)
- `filteredEnrollments` derived via Zustand `computed` pattern or inline selector

---

### Student Pages

**`/courses`** — Course catalog
- Search input (debounced, 300ms)
- Filter sidebar/panel:
  - Course Group (multiselect) → `GET /master-data/codes?groupKey=course_group`
  - Category → `GET /master-data/codes?groupKey=course_category`
  - Level → `GET /master-data/codes?groupKey=course_level`
  - Price: Free / Paid / Price range slider
  - Language dropdown
  - Rating: 4★+, 3★+, etc.
- Course cards grid (3 columns desktop, 2 tablet, 1 mobile)
- Each card: thumbnail, title, instructor, level, duration, price/free badge, rating stars, enrolled count
- "Clear Filters" button
- Pagination / "Load More" button
- Empty state: "No courses found" message when no results

**`/courses/:slug`** — Course overview
- Hero section: thumbnail, title, short description, enroll CTA
- Instructor info block
- Meta bar: level, language, duration, sections, lectures count, rating
- Learning outcomes (bulleted list)
- Requirements (bulleted list)
- Target learners (bulleted list)
- Curriculum accordion (sections collapsible → show lectures with type icon + duration)
  - Lectures with `isPreview = true` → clickable to open preview modal/page
  - Locked lectures → show lock icon
- Sticky sidebar (desktop): price, "Enroll Now" / "Continue Learning" / "Start Learning" button
  - If not logged in → "Enroll Now" → redirect to `/auth/login?redirect=/courses/:slug`
  - If logged in + onboarding incomplete → redirect to `/onboarding`
  - If enrolled → show "Continue Learning" / "Start Learning"
- Certificate availability badge

**`/students/me/courses`** — My Courses page
- Tab: All / In Progress / Completed
- Course card (wider layout):
  - Thumbnail, title, enrollment date, progress bar (percentage), last accessed lecture
  - Status badge: Not Started / In Progress / Completed
  - CTA: "Start Learning" (not started) or "Continue Learning" (in progress) or "View Certificate" (completed)

---

## API Contract Summary

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/courses` | Optional JWT | Public course catalog with search + filters |
| GET | `/courses/:slug` | Optional JWT | Course overview detail |
| POST | `/courses/:slug/enroll` | JWT + Onboarding | Enroll in free course |
| GET | `/students/me/courses` | JWT | My enrolled courses |

---

## Acceptance Criteria Mapping

| Requirement | Implementation |
|---|---|
| Display only published courses in catalog | `status='published'` filter always applied |
| Draft/Unpublished/Inactive courses not shown to student | Enforced in `GET /courses` query |
| Course card shows: title, thumbnail, description, instructor, level, duration, price, rating, enrollments | All fields included in catalog response |
| Search by title, description, category, instructor | Full-text search across those fields |
| Filter by group, category, level, price, duration, language, instructor, rating | All filter params handled in `GET /courses` |
| Multiple filters combined (AND logic) | Query builder adds each filter condition |
| Clear Filters removes all | FE resets query params + refetches |
| Curriculum shows section titles, lecture titles, types, duration, preview availability | `curriculum` array in `GET /courses/:slug` |
| Non-enrolled student can see titles but not content | `is_preview` flag gates content links |
| Enroll Now → prompt sign in if not logged in | FE redirect to login with return URL |
| Redirect to onboarding if profile incomplete | `OnboardingGuard` on enroll endpoint |
| Already enrolled → show Continue Learning | `enrollmentStatus` in course detail response |
| Record student, course, enrollment date, source, status on enroll | All fields saved in `enrollments` row |
| My Courses shows progress, last accessed lecture, completion status | `GET /students/me/courses` returns all fields |
| Continue Learning opens last incomplete lecture | `lastLectureId` in enrollment response → FE navigates |

---

## API Integration (FE)

> Implemented and unit-tested. All routes are prefixed `/api/v1`. Auth is `Authorization: Bearer <accessToken>`.

### Route ownership note

`/api/v1/courses` is now owned by the **public catalog** (`CourseCatalogModule`). The generated CRUD `CoursesController` that previously sat on this path was removed — admin writes already live at `/api/v1/admin/courses` (Epic 3), so no functionality was lost. Nothing else moved.

### 1. Course Catalog

**`GET /api/v1/courses`** — no auth required (send a JWT or not, the response is identical).

Always applies `status = 'published' AND enrollment_open = true`; a draft, unpublished or inactive course can never appear here regardless of query params.

| Param | Type | Notes |
|---|---|---|
| `search` | string | Case-insensitive substring (`ILIKE %term%`) across course title, short description, full description and **instructor full name**. Partial words match. Trimmed; empty string = no filter. |
| `groupId` | uuid | `master_data_code` id in the `course_group` group |
| `categoryId` | uuid | |
| `levelId` | uuid | |
| `minPrice` / `maxPrice` | number | Inclusive bounds |
| `isFree` | boolean | `true`/`false` as a query string; `false` is honoured (not dropped as falsy) |
| `language` | string | Exact match, e.g. `vi` |
| `instructorId` | number | User id (integer, not uuid) |
| `minRating` | number | `avg_rating >= minRating` |
| `page` | number | Default `1` |
| `limit` | number | Default `12`, **hard-capped at 50** — request more and you silently get 50 |

All filters combine with **AND**. Invalid types are rejected with `422` by the validation pipe.

Response `200`:
```json
{
  "data": [{
    "id": "uuid",
    "slug": "career-basics",
    "title": "Career Basics",
    "thumbnailUrl": null,
    "shortDescription": null,
    "instructorName": "Jane Doe",
    "level": { "id": "uuid", "name": "Beginner" },
    "totalDurationSecs": 3600,
    "price": 0,
    "isFree": true,
    "avgRating": 4.5,
    "totalEnrollments": 128
  }],
  "totalCount": 30,
  "page": 1,
  "limit": 12,
  "hasNextPage": true
}
```

> Note this is **not** the boilerplate's `{ data, hasNextPage }` infinity-pagination envelope — it also carries `totalCount`, `page` and `limit` so `useCourseFilterStore` can drive real pagination and the "N results" label. Every optional field is `null` rather than absent, so no `undefined` checks are needed. Empty result → `data: []`, `totalCount: 0` (drive the `isEmpty` state off `totalCount === 0`).

### 2. Course Overview

**`GET /api/v1/courses/:slug`** — optional JWT.

Send the JWT when you have one; it is used only to attach enrollment state. Without it the endpoint still returns `200` (the guard is `jwt` + `anonymous`), so **do not** redirect to login on this call.

Visibility: only `status = 'published'` is returned. Anything else — including a slug that does not exist — is `404 { error: 'courseNotFound' }`. Deliberately **not** 403, so the catalog never confirms an unpublished slug exists.

> A published course with `enrollmentOpen: false` **is** returned here (students can still browse it) but enrolling will fail — see §3. Render the CTA as disabled when `enrollmentOpen` is false.

Response `200`:
```json
{
  "id": "uuid", "slug": "career-basics", "title": "Career Basics",
  "shortDescription": "...", "fullDescription": "...",
  "thumbnailUrl": "...", "introVideoUrl": "...",
  "instructor": { "id": 7, "fullName": "Jane Doe", "profilePictureUrl": "..." },
  "level": { "id": "uuid", "name": "Beginner" },
  "category": { "id": "uuid", "name": "Career" },
  "language": "vi",
  "totalDurationSecs": 7200, "totalSections": 5, "totalLectures": 24,
  "price": 0, "isFree": true, "hasCertificate": true,
  "avgRating": 4.5, "totalEnrollments": 128,
  "learningOutcomes": ["..."],
  "requirements": ["..."],
  "targetLearners": ["..."],
  "groupIds": ["uuid"],
  "curriculum": [{
    "id": "uuid", "title": "Section 1", "displayOrder": 1,
    "lectures": [{
      "id": "uuid", "title": "Intro", "lectureType": "video",
      "durationSecs": 300, "isPreview": true, "displayOrder": 1
    }]
  }],
  "isEnrolled": false,
  "enrollmentStatus": null,
  "enrollmentId": null
}
```

`learningOutcomes` / `requirements` / `targetLearners` are flat `string[]` (the `description` column), already ordered by `displayOrder` — not objects. Sections and lectures are likewise pre-sorted by `displayOrder`; render in array order.

**Curriculum visibility:** every lecture is listed with title, type, duration and `isPreview`, for enrolled and anonymous visitors alike. Content URLs (video/article/document payloads) live in separate lecture-content tables that this endpoint never joins, so there is nothing to hide client-side — a locked lecture simply has no content to fetch. Gate the UI on `isPreview`: `true` → clickable preview, `false` → lock icon.

**Enrollment state** (all three are `null`/`false` for anonymous callers):

| Field | Meaning |
|---|---|
| `isEnrolled` | boolean, convenient for the CTA switch |
| `enrollmentStatus` | the **raw DB status**: `enrolled` \| `in_progress` \| `completed` \| `cancelled`, or `null` when there is no enrollment row |
| `enrollmentId` | the enrollment id, or `null` |

> `enrollmentStatus` is `null` — **not** the string `"not_enrolled"` — when the student has no enrollment. If `useCourseDetailStore` types this as `'not_enrolled' | ...`, map `null → 'not_enrolled'` at the API-client boundary. Note a `cancelled` enrollment still returns `isEnrolled: true`; treat that as "not active" in the CTA if you surface cancellation.

### 3. Enrollment

**`POST /api/v1/courses/:slug/enroll`** — JWT **required** + `OnboardingGuard`. No request body.

Writes an `enrollments` row with `status: 'enrolled'`, `enrollment_date: NOW()`, `enrollment_source: 'organic'`, `progress_pct: 0`, then increments `courses.total_enrollments`.

Response `201`:
```json
{ "enrollmentId": "uuid", "message": "Enrollment successful" }
```

Error handling — this is the full set the enroll button must handle:

| Status | Body | FE action |
|---|---|---|
| `401` | — | Redirect to `/auth/login?redirect=/courses/:slug` |
| `403` | `{ "code": "ONBOARDING_REQUIRED" }` | Redirect to `/onboarding` |
| `404` | `{ "error": "courseNotFound" }` | Slug missing or not published — show "course unavailable" |
| `409` | `{ "code": "ALREADY_ENROLLED" }` | Not a real error: set `enrollmentStatus = 'enrolled'` and flip the CTA to "Continue Learning" |
| `422` | `{ "errors": { "course": "enrollmentClosed" } }` | Course is published but closed to new students |

The `409` is a **hard guarantee against double-enrollment** — the duplicate check is scoped to `(student_id, course_id)`, and the enrollment counter is not incremented when it fires. A double-clicked button therefore cannot inflate `totalEnrollments`.

**`GET /api/v1/students/me/courses`** — JWT required. Returns every enrollment for the caller, **newest enrollment first**. No pagination.

Response `200`:
```json
[{
  "enrollmentId": "uuid",
  "course": { "id": "uuid", "title": "Career Basics", "slug": "career-basics", "thumbnailUrl": "..." },
  "enrollmentDate": "2026-01-05T00:00:00.000Z",
  "progressPct": 45.5,
  "lastLectureId": "uuid",
  "lastLectureTitle": "Lesson 9",
  "lastAccessedAt": "2026-01-06T00:00:00.000Z",
  "status": "in_progress",
  "completedAt": null
}]
```

> The field is `lastLectureTitle` — the epic draft spelled it `lastLectureTile`, which was a typo. "Continue Learning" navigates to `lastLectureId`; when it is `null` the student has not started, so send them to the first lecture from the course overview's `curriculum` instead.

`status` is the raw DB enum, so `useMyCoursesStore`'s tabs map as: **All** = everything, **In Progress** = `in_progress`, **Completed** = `completed`. A freshly enrolled row is `enrolled` (not `in_progress`) — decide whether "Not Started" belongs under the All tab only, and note `progressPct` is a `decimal(5,2)`, so expect fractional values like `45.5`.

### Suggested FE flow

1. `/courses` mount → `syncFromUrl()` → `GET /courses?...`. Debounce filter changes 300ms, then refetch + `syncToUrl()`. Drive "Load More" off `hasNextPage`, the results count off `totalCount`.
2. Filter dropdowns come from Epic 2's master data: `GET /master-data/codes?groupKey=course_group|course_category|course_level`.
3. `/courses/:slug` mount → `GET /courses/:slug` **with the JWT if present**. Populate the CTA from `isEnrolled` / `enrollmentStatus` in one round trip — no second call needed.
4. Enroll CTA → `POST /courses/:slug/enroll`, handling all five statuses in the table above. On `201` and on `409`, both end in the enrolled state.
5. `/students/me/courses` mount → `GET /students/me/courses` once; tab switching filters client-side, no refetch.

### Known gaps / not in this epic

- **Progress is never written yet.** `progressPct`, `startedAt`, `completedAt`, `lastLectureId` and `lastAccessedAt` are stored and returned, but nothing updates them — every new enrollment reads `progressPct: 0`, `status: 'enrolled'`, `lastLectureId: null` until the lecture-player epic lands. Build the My Courses UI against these fields; they will start moving without an API change.
- **No unenroll endpoint** — the `cancelled` status exists in the DB enum but nothing sets it.
- **`avgRating` is an `integer` column** in the current migration despite the `4.5` examples here, so ratings round-trip as whole numbers until that column is widened to `decimal`. `minRating` filtering works either way.
- **Duplicate enrollment is guarded in application code, not by a DB constraint.** There is no unique index on `(student_id, course_id)`, so two truly concurrent requests could in principle both pass the check. Worth adding a unique constraint in a later migration.
