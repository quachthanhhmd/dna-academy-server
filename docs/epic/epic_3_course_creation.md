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
npm run add:property:to-relational -- --name Course --property courseId --kind primitive --type string --isAddToDto true --isOptional true --isNullable true
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

**Course ID (`courseId`)**: client-supplied business code (e.g. `DNA-101`), distinct from the
generated UUID primary key `id`. Required on `POST /admin/courses`, trimmed, max 50 chars.
It must be unique across all courses — `CoursesAdminService` looks it up before saving and
rejects a collision with `422 { errors: { courseId: 'alreadyExists' } }`; a unique index
(`IDX_course_courseId_unique`) on `course."courseId"` is the DB-level backstop. The column is
nullable so pre-existing rows survive the migration and Postgres keeps allowing multiple NULLs.
Editable via `PATCH /admin/courses/:id` (re-checked, skipping the course's own current value).

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
  id: string | null                 // UUID of the course being edited (null on /create)
  courseId: string                  // business course code, e.g. "DNA-101" — user-entered, unique
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
- ⚠️ `id` (the UUID used in every route) and `courseId` (the user-entered business code) are **different fields** — this store previously called the UUID `courseId`, so double-check any existing reference when wiring the code field in.
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
- Course ID — required text input (e.g. `DNA-101`), max 50 chars. Surface the server's `422 { errors: { courseId: 'alreadyExists' } }` as an inline "This course ID is already taken" field error rather than a toast.
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
| Unique course ID entered by the admin | `courseId` on `POST/PATCH /admin/courses`; uniqueness check in `CoursesAdminService` + unique index on `course."courseId"`; duplicate → `422 { errors: { courseId: 'alreadyExists' } }` |
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

---

## API Guide (for FE integration)

Everything below reflects the **actual running implementation** (verified against a live server, including DB-level checks), not just the original spec above. Interactive docs: `http://localhost:3001/docs` · raw OpenAPI JSON: `http://localhost:3001/docs-json`.

### Conventions

- Base path: `/api/v1` (e.g. `http://localhost:3001/api/v1/admin/courses`).
- Auth: `Authorization: Bearer <token>` header. All routes below additionally require the calling user to hold the `courses` permission for the relevant action (`view`/`create`/`edit`/`delete`/`publish`) via the Epic 2 role/permission system — see `PUT /admin/users/:id/roles` and `PUT /admin/roles/:id/permissions` in the Epic 2 API guide. A logged-in user without the right permission gets `403 { code: 'PERMISSION_DENIED', required: { module, action } }`.
- All bodies are JSON (`Content-Type: application/json`).
- **Validation errors** (`422`) normally look like:
  ```json
  { "status": 422, "errors": { "<field>": "<errorCode>" } }
  ```
  The one exception is the **publish checklist**, which uses `{ "status": 422, "missingItems": string[] }` instead (no `errors` key) — see §6.
- **Not-found errors** (`404`) look like: `{ "status": 404, "error": "courseNotFound" | "sectionNotFound" | "lectureNotFound" }`.
- **Section-delete conflict** (`409`): `{ "code": "SECTION_HAS_LECTURES" }` — see §4.
- IDs for `courses`/`sections`/`lectures`/lecture-content rows are UUIDs (strings); `instructorId` is the numeric `users.id`.
- ⚠️ **`id` vs `courseId`**: a course's `id` is the server-generated UUID used in every route (`/admin/courses/:id`). `courseId` is a separate, user-entered business code (e.g. `DNA-101`) that is unique across all courses. Never put `courseId` in a URL path.
- `levelId`/`categoryId`/`groupIds` are `master_data_code` ids — fetch options via the Epic 2 endpoint `GET /master-data-codes?groupKey=course_level|course_category|course_group` (public/any-logged-in-user read).

### 0. File uploads — `POST /api/v1/files/upload` (Cloudflare R2)

`thumbnailUrl` (course) and `fileUrl` (`pdf_document` lecture content) are plain
strings on the course/lecture payloads — the API never receives the binary on
those endpoints. Upload the file first, then send the returned URL.

Storage is **Cloudflare R2** (`FILE_DRIVER=r2`). Allowed: `jpg`, `jpeg`, `png`,
`gif`, `webp`, `avif`, `svg`, `pdf`; max size `FILE_MAX_SIZE` (25mb default).

**`FILE_DRIVER=r2`** — multipart upload through the API (default):

```
POST /api/v1/files/upload      Authorization: Bearer <token>
Content-Type: multipart/form-data      field: file
```

Response `201`:

```json
{ "file": { "id": "uuid", "path": "https://cdn.example.com/9f2c….png" } }
```

`file.path` is the URL to store in `thumbnailUrl` / `fileUrl`. It is a permanent
public URL when the bucket is exposed via `R2_PUBLIC_URL`; otherwise it is a
presigned GET URL valid for one hour, so re-read it from the API rather than
caching it.

**`FILE_DRIVER=r2-presigned`** — for large PDFs, the browser uploads straight to
R2: `POST /api/v1/files/upload` with `{ "fileName", "fileSize", "contentType" }`
returns `{ file, uploadSignedUrl }`; `PUT` the bytes to `uploadSignedUrl` (same
`Content-Type`, valid one hour), then use `file.path`.

Errors: `422 { errors: { file: "cantUploadFileType" } }` for a rejected
extension, `413` when over the size limit.

### 1. Course CRUD — `POST/GET/PATCH /admin/courses`

**`POST /admin/courses`** — create (always starts `status: 'draft'`).
```json
{
  "courseId": "DNA-101",
  "title": "Intro to TypeScript",
  "shortDescription": "Learn the basics",
  "fullDescription": "<p>...</p>",
  "thumbnailUrl": "https://.../thumb.png",
  "introVideoUrl": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  "language": "en",
  "price": 0,
  "hasCertificate": false,
  "enrollmentOpen": true,
  "levelId": "<master_data_code id, course_level>",
  "categoryId": "<master_data_code id, course_category>",
  "instructorId": 7
}
```
- `courseId`, `title`, `language`, `price`, `hasCertificate`, `enrollmentOpen` are required; everything else is optional.
- **`courseId`** is the human-readable course code you choose (e.g. `DNA-101`) — **not** the UUID `id`. It is trimmed server-side, capped at 50 chars, and must be **unique across all courses**. A duplicate is rejected with:
  ```json
  { "status": 422, "errors": { "courseId": "alreadyExists" } }
  ```
  An empty/missing `courseId` is a plain `422` validation error from the DTO. Note this is the only uniqueness rule the client owns — unlike `slug`, the server does **not** auto-suffix a taken `courseId`, so surface the error on the field and let the admin pick another code.
- `slug` is auto-generated from `title` (`slugify`, lowercased, collisions suffixed `-2`, `-3`, ...) — not settable by the client.
- `introVideoUrl`, if given, is validated via the YouTube oEmbed API; an unreachable/invalid video → `422 { errors: { introVideoUrl: ... } }` (message from `YoutubeService`).
- `levelId`/`categoryId` must be **active** `master_data_code` rows in the matching group, else `422 { errors: { levelId: "notExists" } }` (same for `categoryId`).
- `instructorId` must be an existing user id, else `422 { errors: { instructorId: "notExists" } }`.
- `isFree` is derived server-side (`price === 0`); `totalSections`/`totalLectures`/`totalDurationSecs`/`totalEnrollments` default to `0`.

Response `201`: the full `Course` object (see shape below).

**`GET /admin/courses`** — paginated list.
Query params: `status`, `levelId`, `categoryId`, `instructorId` (all optional filters), `page` (default 1), `limit` (default 10, max 50).
Response `200`: `{ "data": Course[], "hasNextPage": boolean }`.

**`GET /admin/courses/:id`** — full detail, including nested curriculum. Response `200`:
```json
{
  "id": "...", "courseId": "DNA-101", "slug": "...", "title": "...", "status": "draft",
  "shortDescription": "...", "fullDescription": "...", "thumbnailUrl": "...",
  "introVideoUrl": "...", "language": "en", "price": 0, "isFree": true,
  "hasCertificate": false, "enrollmentOpen": true,
  "level": { "id": "...", "code": "...", "name": "...", "group": { "groupKey": "course_level" } },
  "category": { "...": "same shape, group.groupKey = course_category" },
  "instructor": { "id": 7, "fullName": "...", "...": "User" } ,
  "totalSections": 1, "totalLectures": 3, "totalDurationSecs": 900,
  "totalEnrollments": 0, "avgRating": null,
  "publishedAt": null, "publishedBy": null,
  "createdAt": "...", "updatedAt": "...",
  "sections": [
    {
      "id": "...", "title": "Section 1", "displayOrder": 1,
      "description": null, "learningObjective": null,
      "lectures": [
        { "id": "...", "title": "Lecture 1", "lectureType": "video", "status": "draft",
          "durationSecs": 300, "isPreview": false, "requiresCompletion": true, "displayOrder": 1 }
      ]
    }
  ],
  "learningOutcomes": [{ "id": "...", "description": "...", "displayOrder": 1 }],
  "requirements": [{ "...": "same shape" }],
  "targetLearners": [{ "...": "same shape" }],
  "groupIds": ["<master_data_code id>", "..."]
}
```
> Note: `GET /admin/courses` (list) items use the plain `Course` shape (no `sections`/lists nesting) — only the single-course `GET /admin/courses/:id` includes the full curriculum + lists. Also note: **lecture-level content is not embedded here** — `lectureType` tells you which content sub-form to render, but you must call the content endpoint separately if you need the saved content payload (there is currently no `GET` for it; see the caveat in §5).

**`PATCH /admin/courses/:id`** — partial update, any subset of the `POST` body fields. Omitted fields are left untouched (server strips `undefined` keys before merging, so there is no risk of accidentally nulling other fields). Same `introVideoUrl`/`levelId`/`categoryId`/`instructorId` validation as create. Response `200`: full `Course` object.

`courseId` may be changed here and is re-checked for uniqueness, same `422 { errors: { courseId: "alreadyExists" } }` on collision. Re-sending the course's own current `courseId` is a no-op, not a conflict — so a form that always PATCHes the whole overview tab is safe.

### 2. Course Supporting Lists

Three identical-shaped sub-resources, each a **full replace** (not additive/patch):

- `PUT /admin/courses/:id/outcomes`
- `PUT /admin/courses/:id/requirements`
- `PUT /admin/courses/:id/target-learners`

Request: `{ "items": [{ "description": "...", "displayOrder": 1 }, ...] }` (`items` may be `[]` to clear the list). Response `200`: the new list, e.g. `[{ "id": "...", "description": "...", "displayOrder": 1 }]`.

### 3. Course Group Assignment

`PUT /admin/courses/:id/groups`
```json
{ "groupIds": ["<master_data_code id, course_group>", "..."] }
```
Every id must be an **active** code in the `course_group` group, else `422 { errors: { groupIds: "notExists:<id>" } }` (the failing id is embedded in the code). On success, fully replaces `course_group_assignments` for the course. Response `200`: `string[]` of the new `groupIds`.

### 4. Sections CRUD

All under `/admin/courses/:courseId/sections`.

- **`POST /`** — `{ "title": "...", "description"?: "...", "learningObjective"?: "...", "displayOrder": 1 }` → `201` Section.
- **`GET /`** — list, ordered by `displayOrder`.
- **`PATCH /:id`** — partial update (same fields as create, all optional).
- **`PATCH /reorder`** — `{ "orderedIds": ["<id>", "..."] }` must be **exactly** the course's current section ids (a permutation, no missing/extra), else `422 { errors: { orderedIds: "mustMatchExistingSections" } }`. Response `200`: sections in the new order, each with its updated `displayOrder`.
- **`DELETE /:id`** — if the section has lectures, the request body must be `{ "force": true }` to cascade-delete them; otherwise `409 { code: "SECTION_HAS_LECTURES" }`. Response `204`.
- Any create/delete/reorder here (and any lecture mutation below) triggers a server-side recalculation of the parent course's `totalSections`/`totalLectures`/`totalDurationSecs` — re-fetch `GET /admin/courses/:id` (or trust the response body, where returned) to pick up the new totals.

### 5. Lectures CRUD, Move, and Content

**CRUD** — under `/admin/courses/:courseId/sections/:sectionId/lectures`:

- **`POST /`** — `{ "title": "...", "description"?: "...", "lectureType": "video"|"article"|"pdf_document"|"quiz"|"reflection", "durationSecs": 0, "isPreview": false, "requiresCompletion": true, "displayOrder": 1 }` → `201` Lecture (`status` defaults to `draft`; `lectureType` is only a type tag here — no content row is created until you call the content endpoint).
- **`PATCH /:id`** — partial update. **Changing `lectureType` here does NOT clear old content** — only saving new content via §5's content endpoint with a different `lectureType` does that (see below). Prefer changing type through the content endpoint so the two stay in sync.
- **`DELETE /:id`** → `204`.
- **`PATCH /reorder`** — `{ "orderedIds": [...] }`, exact-set validated like sections (`422 { errors: { orderedIds: "mustMatchExistingLectures" } }` on mismatch).

**Move between sections** — `PATCH /admin/courses/:courseId/lectures/:id/move`
```json
{ "targetSectionId": "<section id>", "displayOrder": 1 }
```
`targetSectionId` must belong to the **same course** (`courseId` in the URL), else `422 { errors: { targetSectionId: "notExists" } }`. Response `200`: the moved Lecture, `section` populated with its new parent.

**Content** — `PATCH /admin/lectures/:id/content` (note: **not** nested under `/courses/:courseId/...` — just the lecture id). This is the single endpoint for saving type-specific content; `lectureType` in the body both selects the content shape **and** updates `lectures.lecture_type`.

Body varies by `lectureType`:

| lectureType | Required fields | Optional fields |
|---|---|---|
| `video` | `youtubeUrl` | — |
| `article` | `body` (HTML string) | — |
| `pdf_document` | `fileUrl` | `fileName`, `isDownloadable` (default `false`) |
| `quiz` | `passingScore`, `allowResume` | `instructions`, `quizQuestions[]` |
| `reflection` | `minResponseLength` | `reflectionQuestions[]` |

Missing a required field for the chosen type → `422 { errors: { <field>: "required" } }` (quiz's combined check → `422 { errors: { quiz: "passingScoreAndAllowResumeRequired" } }`). An invalid YouTube URL → `422` from the oEmbed check (same as course `introVideoUrl`).

`quizQuestions[]` items: `{ questionText, questionType, isRequired, displayOrder, ratingMin?, ratingMax?, ratingLabelMin?, ratingLabelMax?, minWordCount?, allowedMimeTypes?, maxFileSizeMb?, options?: [{ optionText, isCorrect, displayOrder }] }`. `questionType` is a free-form string the FE defines the meaning of (e.g. `single_choice`, `short_text`, `rating`, `file_upload`) — the BE does not branch on it beyond storing it.

`reflectionQuestions[]` items: `{ questionText, displayOrder }`.

**Every save fully replaces** `quizQuestions`/`options` or `reflectionQuestions` for that lecture — there is no per-question patch; resend the complete list each time.

**Type switch behavior**: if `lectureType` in the request differs from the lecture's current type, the previous type's content (and its questions/options) is **deleted** before the new content is saved, and the response includes `"incompatibleContentCleared": true` (else `false`). FE should show a confirm dialog before letting the admin submit a type change.

Response `200`: the created/updated content row (shape depends on type — `LectureContentVideo`/`Article`/`Document`/`Quiz`/`Reflection`), **plus** `incompatibleContentCleared`. It does **not** include the nested `quizQuestions`/`reflectionQuestions` in the response body even though they were just saved — re-fetch if you need to display them back immediately after save.

> **Known gap**: there is currently no `GET /admin/lectures/:id/content` to fetch previously-saved content. If the admin reopens the lecture editor, the FE has no BE-provided way to pre-fill the type-specific form — only `lectureType` is visible via `GET /admin/courses/:id`. Track saved content client-side (e.g. keep it in the Zustand store after each successful `PATCH .../content`) until a fetch endpoint is added.

### 6. Publish / Unpublish

**`POST /admin/courses/:id/publish`** (no body). Validates a checklist and, if it passes, publishes. Response `200`: the full `Course` object with `status: "published"`, `publishedAt` (ISO timestamp), `publishedBy` (the calling admin's `User` object).

Checklist (all must pass):
- `title`, `shortDescription`, `thumbnailUrl` are all non-empty.
- `levelId` and `categoryId` are both set.
- The course has at least one section, and that section (any section) has at least one lecture.
- **Every** lecture in the course has its type-specific content saved (checked via the corresponding content table's `findByLectureId`).

On failure → `422`:
```json
{ "status": 422, "missingItems": ["shortDescription", "thumbnailUrl", "levelId", "categoryId", "curriculum"] }
```
Possible codes: `title`, `shortDescription`, `thumbnailUrl`, `levelId`, `categoryId`, `curriculum` (no sections, or no lectures in any section), `lectureContent` (one or more lectures still missing their content — this code does not currently name which lecture(s)). FE should map these codes to the checklist modal's line items and, on `curriculum`/`lectureContent`, send the admin back to Tab 3.

**`POST /admin/courses/:id/unpublish`** (no body). Sets `status: 'unpublished'` only — `publishedAt`/`publishedBy` are **left as-is** (not cleared), and enrollment/progress records are untouched. Response `200`: full `Course` object.

### Suggested FE flow

1. `/admin/courses` → `GET /admin/courses?status=&levelId=&categoryId=` for the table; "Create Course" → `POST /admin/courses` with just `courseId`/`title`/`language`/`price`/`hasCertificate`/`enrollmentOpen`, then redirect straight into the editor. If the create comes back `422` with `errors.courseId === 'alreadyExists'`, keep the admin on the create form with the error attached to the Course ID field — do not redirect.
2. `/admin/courses/:id/edit` → `GET /admin/courses/:id` once on mount, feed the full response into `useCourseEditorStore.loadCourse(...)`.
3. Tab 1 (Overview) → `PATCH /admin/courses/:id` on save; Tab 2 (Lists) → the three `PUT .../outcomes|requirements|target-learners` plus `PUT .../groups`.
4. Tab 3 (Curriculum) → section/lecture CRUD + `.../reorder` + `.../move`; lecture drawer save → `PATCH /admin/lectures/:id/content`. If the response has `incompatibleContentCleared: true` and this wasn't expected, surface a toast ("previous content for this lecture was removed").
5. Publish bar → `POST /admin/courses/:id/publish`. On `422`, populate `missingItems` in the store and open the checklist modal (`publishChecklistOpen: true`) instead of a generic error toast. On success, update `status`/`publishedAt`/`publishedBy` from the response.
6. "Unpublish" action (e.g. from the course list row menu) → `POST /admin/courses/:id/unpublish`, then patch `status` in local state — no need to re-fetch the whole course.
