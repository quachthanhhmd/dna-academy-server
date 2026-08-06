# Epic 3 — Course Creation & Publishing

## Stack
- **BE**: NestJS (brocoders/nestjs-boilerplate, relational/PostgreSQL variant)
- **FE**: Next.js (brocoders/extensive-react-boilerplate)
- **DB**: PostgreSQL via TypeORM

## DB Tables Involved
- `courses` — core course record
- `course_group_assignments` — M2M course ↔ master_data_code (group_key=course_group)
- `course_learning_outcomes`, `course_requirements`, `course_target_learners` — bullet-point lists
- `sections` — ordered sections under a course
- `lectures` — ordered lectures under a section
- `lecture_content_video`, `lecture_content_article`, `lecture_content_document` — typed content
- `lecture_content_quiz`, `quiz_questions`, `quiz_answer_options` — quiz content
- `lecture_content_reflection`, `reflection_questions` — reflection content

---

## BE Tasks

### 1. Course Entity & CRUD

**Generate entities:**
```
npm run generate:resource:relational -- --name Course
npm run add:property:to-relational -- --name Course --property slug --kind primitive --type string --isAddToDto false --isOptional false --isNullable false
npm run add:property:to-relational -- --name Course --property title --kind primitive --type string --isAddToDto true --isOptional false --isNullable false
npm run add:property:to-relational -- --name Course --property shortDescription --kind primitive --type string --isAddToDto true --isOptional true --isNullable true
npm run add:property:to-relational -- --name Course --property fullDescription --kind primitive --type string --isAddToDto true --isOptional true --isNullable true
npm run add:property:to-relational -- --name Course --property thumbnailUrl --kind primitive --type string --isAddToDto true --isOptional true --isNullable true
npm run add:property:to-relational -- --name Course --property introVideoUrl --kind primitive --type string --isAddToDto true --isOptional true --isNullable true
npm run add:property:to-relational -- --name Course --property language --kind primitive --type string --isAddToDto true --isOptional false --isNullable false
npm run add:property:to-relational -- --name Course --property price --kind primitive --type number --isAddToDto true --isOptional false --isNullable false
npm run add:property:to-relational -- --name Course --property hasCertificate --kind primitive --type boolean --isAddToDto true --isOptional false --isNullable false
npm run add:property:to-relational -- --name Course --property enrollmentOpen --kind primitive --type boolean --isAddToDto true --isOptional false --isNullable false
npm run add:property:to-relational -- --name Course --property status --kind primitive --type string --isAddToDto false --isOptional false --isNullable false
npm run add:property:to-relational -- --name Course --property levelId --kind primitive --type string --isAddToDto true --isOptional true --isNullable true
npm run add:property:to-relational -- --name Course --property categoryId --kind primitive --type string --isAddToDto true --isOptional true --isNullable true
npm run add:property:to-relational -- --name Course --property instructor --kind reference --type User --referenceType manyToOne --isAddToDto true --isOptional true --isNullable true --shouldAutoLoad false
npm run add:property:to-relational -- --name Course --property totalSections --kind primitive --type number --isAddToDto false --isOptional false --isNullable false
npm run add:property:to-relational -- --name Course --property totalLectures --kind primitive --type number --isAddToDto false --isOptional false --isNullable false
npm run add:property:to-relational -- --name Course --property totalDurationSecs --kind primitive --type number --isAddToDto false --isOptional false --isNullable false
npm run add:property:to-relational -- --name Course --property publishedAt --kind primitive --type Date --isAddToDto false --isOptional true --isNullable true
npm run add:property:to-relational -- --name Course --property publishedBy --kind reference --type User --referenceType manyToOne --isAddToDto false --isOptional true --isNullable true --shouldAutoLoad false
```

**Slug generation**: on `POST /admin/courses`, auto-generate slug from title using `slugify` library.
Check uniqueness in `courses` table. Append `-2`, `-3` etc. if collision.

**Validate `introVideoUrl`**: if provided, call YouTube oEmbed API `https://www.youtube.com/oembed?url={url}` to verify URL is valid before saving.

**Course list/detail endpoints — `CoursesAdminModule`:**

`POST /admin/courses` — create course (status = `draft`)

`GET /admin/courses` — paginated list with filters: status, levelId, categoryId, instructorId

`GET /admin/courses/:id` — full course detail including sections/lectures structure

`PATCH /admin/courses/:id` — update course fields

---

### 2. Course Supporting Lists (outcomes, requirements, target learners)

Implement as sub-resources on the course:

`PUT /admin/courses/:id/outcomes` — replace all `course_learning_outcomes` for this course
- Accept `{ items: { description: string, displayOrder: number }[] }`

`PUT /admin/courses/:id/requirements` — replace all `course_requirements`

`PUT /admin/courses/:id/target-learners` — replace all `course_target_learners`

---

### 3. Course Group Assignment

`PUT /admin/courses/:id/groups`
- Accept `{ groupIds: string[] }` (IDs from `master_data_code` where group_key=`course_group`)
- Validate each ID is active code in `course_group` group
- Replace all `course_group_assignments` for this course

---

### 4. Sections CRUD

**Generate entity:**
```
npm run generate:resource:relational -- --name Section
npm run add:property:to-relational -- --name Section --property title --kind primitive --type string --isAddToDto true --isOptional false --isNullable false
npm run add:property:to-relational -- --name Section --property description --kind primitive --type string --isAddToDto true --isOptional true --isNullable true
npm run add:property:to-relational -- --name Section --property learningObjective --kind primitive --type string --isAddToDto true --isOptional true --isNullable true
npm run add:property:to-relational -- --name Section --property displayOrder --kind primitive --type number --isAddToDto true --isOptional false --isNullable false
npm run add:property:to-relational -- --name Section --property course --kind reference --type Course --referenceType manyToOne --isAddToDto false --isOptional false --isNullable false --shouldAutoLoad false
```

`POST /admin/courses/:courseId/sections`
`GET /admin/courses/:courseId/sections` — ordered by `display_order`
`PATCH /admin/courses/:courseId/sections/:id`
`DELETE /admin/courses/:courseId/sections/:id`
- If section has lectures → require `{ force: true }` to cascade delete lectures
- On delete/create/reorder → recalculate `courses.total_sections`, `total_lectures`, `total_duration_secs`

`PATCH /admin/courses/:courseId/sections/reorder`
- Accept `{ orderedIds: string[] }` → update `display_order` for each section

---

### 5. Lectures CRUD

**Generate entity:**
```
npm run generate:resource:relational -- --name Lecture
npm run add:property:to-relational -- --name Lecture --property title --kind primitive --type string --isAddToDto true --isOptional false --isNullable false
npm run add:property:to-relational -- --name Lecture --property description --kind primitive --type string --isAddToDto true --isOptional true --isNullable true
npm run add:property:to-relational -- --name Lecture --property lectureType --kind primitive --type string --isAddToDto true --isOptional false --isNullable false
npm run add:property:to-relational -- --name Lecture --property durationSecs --kind primitive --type number --isAddToDto true --isOptional false --isNullable false
npm run add:property:to-relational -- --name Lecture --property isPreview --kind primitive --type boolean --isAddToDto true --isOptional false --isNullable false
npm run add:property:to-relational -- --name Lecture --property requiresCompletion --kind primitive --type boolean --isAddToDto true --isOptional false --isNullable false
npm run add:property:to-relational -- --name Lecture --property displayOrder --kind primitive --type number --isAddToDto true --isOptional false --isNullable false
npm run add:property:to-relational -- --name Lecture --property status --kind primitive --type string --isAddToDto true --isOptional false --isNullable false
npm run add:property:to-relational -- --name Lecture --property section --kind reference --type Section --referenceType manyToOne --isAddToDto false --isOptional false --isNullable false --shouldAutoLoad false
```

`POST /admin/courses/:courseId/sections/:sectionId/lectures`
`PATCH /admin/courses/:courseId/sections/:sectionId/lectures/:id`
`DELETE /admin/courses/:courseId/sections/:sectionId/lectures/:id`
`PATCH /admin/courses/:courseId/sections/:sectionId/lectures/reorder`

**Move lecture between sections:**
`PATCH /admin/courses/:courseId/lectures/:id/move`
- Accept `{ targetSectionId, displayOrder }`

**Lecture type content** — handled as sub-resource `PATCH /admin/lectures/:id/content`:
- Validate `lectureType` field to know which content table to upsert
- `video`: validate `youtubeUrl` via YouTube oEmbed, extract `youtubeVideoId`
- `article`: save `body` HTML string
- `pdf_document`: save `fileUrl`, `fileName`, `isDownloadable`
- `quiz`: upsert `lecture_content_quiz` + replace `quiz_questions` + `quiz_answer_options`
- `reflection`: upsert `lecture_content_reflection` + replace `reflection_questions`
- On type change: warn FE via response field `{ incompatibleContentCleared: true }` when previous content was deleted

After any lecture save → trigger recalculate aggregates on `courses`.

---

### 6. Publish / Unpublish

`POST /admin/courses/:id/publish`
- Validate publication checklist:
  - `title`, `shortDescription`, `thumbnailUrl` present
  - At least 1 section with at least 1 lecture
  - Each lecture has content saved
  - `levelId`, `categoryId` set
- If validation fails → 422 with `{ missingItems: string[] }`
- On success: set `status = 'published'`, `published_at = NOW()`, `published_by = req.user.id`

`POST /admin/courses/:id/unpublish`
- Set `status = 'unpublished'`
- Enrollment/progress records untouched

---

## FE Tasks

### Zustand Stores

#### `useCourseEditorStore`
Manages all mutable state for the course creation/edit flow. Scoped to the editor page — reset on unmount.

```ts
interface CourseEditorStore {
  // Course overview fields
  courseId: string | null
  title: string
  shortDescription: string
  fullDescription: string
  thumbnailUrl: string
  introVideoUrl: string
  language: string
  price: number
  hasCertificate: boolean
  enrollmentOpen: boolean
  status: 'draft' | 'published' | 'unpublished' | 'inactive'
  levelId: string | null
  categoryId: string | null
  instructorId: string | null
  groupIds: string[]

  // Bullet-point lists
  learningOutcomes: { id?: string; description: string; displayOrder: number }[]
  requirements: { id?: string; description: string; displayOrder: number }[]
  targetLearners: { id?: string; description: string; displayOrder: number }[]

  // Curriculum
  sections: Section[]               // Section[] includes nested lectures[]
  activeSectionId: string | null
  activeLectureId: string | null
  lectureDrawerOpen: boolean

  // Publish state
  missingItems: string[]            // populated when publish validation fails
  publishChecklistOpen: boolean

  // Dirty / save tracking
  isDirty: boolean
  isSaving: boolean
  lastSavedAt: Date | null

  // Actions — overview
  setField: (key: keyof CourseOverviewFields, value: unknown) => void
  loadCourse: (course: CourseDetail) => void
  resetEditor: () => void

  // Actions — lists
  addOutcome: () => void
  updateOutcome: (index: number, description: string) => void
  removeOutcome: (index: number) => void
  reorderOutcomes: (orderedItems: typeof learningOutcomes) => void
  // same pattern for requirements and targetLearners

  // Actions — curriculum
  addSection: (section: Section) => void
  updateSection: (id: string, data: Partial<Section>) => void
  removeSection: (id: string) => void
  reorderSections: (orderedIds: string[]) => void
  addLecture: (sectionId: string, lecture: Lecture) => void
  updateLecture: (id: string, data: Partial<Lecture>) => void
  removeLecture: (id: string) => void
  moveLecture: (lectureId: string, targetSectionId: string, displayOrder: number) => void
  reorderLectures: (sectionId: string, orderedIds: string[]) => void
  openLectureDrawer: (lectureId: string) => void
  closeLectureDrawer: () => void

  // Actions — publish
  setMissingItems: (items: string[]) => void
  setPublishChecklistOpen: (open: boolean) => void
}
```

**Usage rules:**
- `loadCourse(course)` called once on page mount from `GET /admin/courses/:id`
- Every field change sets `isDirty = true`
- "Save Draft" button calls API then sets `isDirty = false`, `lastSavedAt = now`
- `resetEditor()` called in `useEffect` cleanup on unmount
- Drag-drop reorder → update store immediately (optimistic) → call reorder API in background

#### `useMasterDataStore`
Lightweight cache for master data dropdown options. Shared across admin pages.

```ts
interface MasterDataStore {
  codes: Record<string, MasterDataCode[]>   // keyed by groupKey
  loading: Record<string, boolean>

  fetchCodes: (groupKey: string) => Promise<void>  // no-op if already loaded
  getCodesForGroup: (groupKey: string) => MasterDataCode[]
}
```

**Usage**: call `fetchCodes('course_level')`, `fetchCodes('course_category')` etc. on Tab 1 mount. Avoids duplicate API calls if admin navigates between tabs.

---

### Admin Pages

**`/admin/courses`** — Course list
- Table: Thumbnail | Title | Status | Level | Category | Enrollments | Published At | Actions
- Filter by status, level, category
- "Create Course" button

**`/admin/courses/create`** and **`/admin/courses/:id/edit`** — Course editor (multi-tab layout):

**Tab 1: Overview**
- Title, short description, full description (rich text editor)
- Thumbnail URL upload field
- YouTube intro video URL (validate on blur → show preview)
- Language, price, certificate toggle, enrollment open toggle
- Level → `<Select>` from `GET /master-data/codes?groupKey=course_level`
- Category → `<Select>` from `GET /master-data/codes?groupKey=course_category`
- Instructor → `<Select>` users with instructor role
- Course groups → `<MultiSelect>` from `GET /master-data/codes?groupKey=course_group`

**Tab 2: Outcomes / Requirements / Learners**
- Three drag-sortable lists: Learning Outcomes, Requirements, Target Learners
- Each item: text input + delete button + drag handle
- "Save" → `PUT /admin/courses/:id/outcomes` etc.

**Tab 3: Curriculum**
- Tree view: Sections → Lectures (nested drag-drop for reorder)
- "Add Section" inline
- Per section: "Add Lecture" button
- Per lecture: click to expand drawer/modal with:
  - Basic fields (title, description, type selector, duration, preview toggle, completion toggle)
  - Type-specific content form (see below)
  - Type change → show confirm dialog: "Changing type will remove existing content"

**Lecture content sub-forms:**
- `video`: YouTube URL input + embedded preview
- `article`: rich text editor (Tiptap or similar)
- `pdf_document`: URL input, filename, downloadable toggle
- `quiz`: passing score, allow resume; add/remove questions; per question: type selector, question text, answer options, mark correct
- `reflection`: min response length; add/remove reflection questions

**Tab 4: Preview (as Student)**
- Renders course overview page in `<iframe>` or same-tab with `?preview=true` query
- Responsive toggle: desktop / tablet / mobile (resize preview container)
- "Back to Edit" button

**Publish bar** (sticky bottom):
- Shows current status badge
- "Save Draft" | "Publish" buttons
- On publish click → show checklist modal if validation fails

---

## API Contract Summary

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/admin/courses` | Admin | Create course (draft) |
| GET | `/admin/courses` | Admin | List courses |
| GET | `/admin/courses/:id` | Admin | Get full course detail |
| PATCH | `/admin/courses/:id` | Admin | Update course |
| PUT | `/admin/courses/:id/outcomes` | Admin | Replace learning outcomes |
| PUT | `/admin/courses/:id/requirements` | Admin | Replace requirements |
| PUT | `/admin/courses/:id/target-learners` | Admin | Replace target learners |
| PUT | `/admin/courses/:id/groups` | Admin | Set course group assignments |
| POST | `/admin/courses/:id/publish` | Admin | Publish course |
| POST | `/admin/courses/:id/unpublish` | Admin | Unpublish course |
| POST | `/admin/courses/:courseId/sections` | Admin | Create section |
| PATCH | `/admin/courses/:courseId/sections/:id` | Admin | Update section |
| DELETE | `/admin/courses/:courseId/sections/:id` | Admin | Delete section |
| PATCH | `/admin/courses/:courseId/sections/reorder` | Admin | Reorder sections |
| POST | `/admin/courses/:courseId/sections/:sectionId/lectures` | Admin | Create lecture |
| PATCH | `/admin/courses/:courseId/sections/:sectionId/lectures/:id` | Admin | Update lecture |
| DELETE | `/admin/courses/:courseId/sections/:sectionId/lectures/:id` | Admin | Delete lecture |
| PATCH | `/admin/courses/:courseId/lectures/:id/move` | Admin | Move lecture to another section |
| PATCH | `/admin/lectures/:id/content` | Admin | Save lecture type content |

---

## Acceptance Criteria Mapping

| Requirement | Implementation |
|---|---|
| Auto-generate unique URL slug on course create | `slugify(title)` + uniqueness check in `CoursesService` |
| Validate YouTube URL on intro video | YouTube oEmbed check in BE service |
| Save as Draft without all fields | `POST /admin/courses` allows partial save |
| Drag-drop reorder sections and lectures | FE drag-drop + `PATCH .../reorder` API |
| Move lecture to another section | `PATCH /admin/courses/:id/lectures/:id/move` |
| Warn on lecture type change — content may be removed | BE returns `incompatibleContentCleared`, FE shows confirm dialog |
| Auto-calculate total sections, lectures, duration | BE service recalculates on every section/lecture mutation |
| Publish validation checklist | `POST /admin/courses/:id/publish` returns `{ missingItems }` on 422 |
| Record publish date, time, user | `published_at`, `published_by` set on publish |
| Unpublish preserves enrollment/progress records | Only `status` field changed to `unpublished` |
| Preview as student in desktop/tablet/mobile | FE preview tab with responsive container toggle |
