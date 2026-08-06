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
