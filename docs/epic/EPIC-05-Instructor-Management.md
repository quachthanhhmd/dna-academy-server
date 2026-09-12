# EPIC 5 — Instructor Management

> **Goal:** Introduce a first-class **Instructor** entity so that admins can create, maintain, and assign real teacher profiles (name, headline, bio, photo, expertise, social links) to one or many courses, instead of relying on a raw `users` foreign key. Students see richer instructor information on course discovery and overview screens.

**Epic owner:** Product / Platform
**Depends on:** EPIC 1 (Auth & Onboarding), EPIC 2 (Roles & Permissions), EPIC 3 (Master Data), EPIC 4 (Course Creation & Publishing)
**Impacted personas:** Admin, Student, Guest
**Impacted screens (existing):** `ADM_SHL_11`, `ADM_ROL_12`, `ADM_MAS_13`, `ADM_CRS_14`, `ADM_DCR_17`, `STU_CAT_03`, `STU_OVR_04`
**New screen:** `ADM_INS_19` — Instructor Management (master-detail)

---

## Table of Contents

1. [Scope & User Stories](#1-scope--user-stories)
2. [BE Work](#2-be-work)
3. [FE Work](#3-fe-work)
4. [API Integration](#4-api-integration)
5. [Acceptance Criteria (Epic-level)](#5-acceptance-criteria-epic-level)
6. [Out of Scope (V1)](#6-out-of-scope-v1)

---

## 1. Scope & User Stories

The epic contains **10 user stories (UC-INS-01 → UC-INS-10)** grouped into three themes.

| ID | Story | Persona | Screen |
|---|---|---|---|
| UC-INS-01 | Create a new instructor | Admin | `ADM_INS_19` |
| UC-INS-02 | Edit instructor profile | Admin | `ADM_INS_19` |
| UC-INS-03 | Activate / deactivate an instructor | Admin | `ADM_INS_19` |
| UC-INS-04 | Delete an instructor (only if not assigned) | Admin | `ADM_INS_19` |
| UC-INS-05 | Search / filter / paginate instructor list | Admin | `ADM_INS_19` |
| UC-INS-06 | Assign primary + co-instructors to a course | Admin | `ADM_CRS_14` |
| UC-INS-07 | View per-instructor stats (courses, students, avg rating) | Admin | `ADM_INS_19` (Stats tab) + widget in `ADM_DCR_17` |
| UC-INS-08 | Link an instructor to a `users` account (optional) | Admin | `ADM_INS_19` |
| UC-INS-09 | View an instructor profile (student side) | Student / Guest | Drawer inside `STU_OVR_04` |
| UC-INS-10 | Filter course catalog by instructor | Student | `STU_CAT_03` |

---

## 2. BE Work

### 2.1 Database changes

#### 2.1.1 New tables

**`instructors` — core entity**

```sql
CREATE TABLE "instructors" (
  "id"                   uuid PRIMARY KEY,
  "user_id"              uuid UNIQUE,                        -- NULLABLE: link to users when instructor has a login account
  "slug"                 varchar(200) UNIQUE NOT NULL,       -- URL-safe, auto-generated from full_name
  "full_name"            varchar(200) NOT NULL,
  "headline"             varchar(300),                       -- short tagline, e.g. "Senior Data Analyst @ VNG"
  "bio"                  text,                               -- rich-text / HTML
  "profile_picture_url"  text,                               -- R2 URL, separate from users.profile_picture_url
  "email_public"         varchar(255),                       -- displayed publicly (may differ from users.email)
  "years_of_experience"  smallint,
  "is_active"            boolean     NOT NULL DEFAULT true,  -- inactive => cannot be assigned to NEW courses
  "display_order"        smallint    NOT NULL DEFAULT 0,
  "total_courses"        smallint    NOT NULL DEFAULT 0,     -- denormalized counter, kept in sync by trigger/job
  "total_students"       int         NOT NULL DEFAULT 0,     -- denormalized counter
  "avg_rating"           decimal(3,2),                       -- denormalized, aggregated from course_ratings
  "created_by"           uuid,
  "created_at"           timestamptz NOT NULL DEFAULT (now()),
  "updated_at"           timestamptz NOT NULL DEFAULT (now())
);

ALTER TABLE "instructors" ADD FOREIGN KEY ("user_id")    REFERENCES "users" ("id");
ALTER TABLE "instructors" ADD FOREIGN KEY ("created_by") REFERENCES "users" ("id");

CREATE INDEX ON "instructors" ("is_active", "display_order");
CREATE INDEX ON "instructors" USING gin (to_tsvector('simple', full_name || ' ' || coalesce(headline, '')));
```

**`course_instructors` — M2M join table (primary + co-instructor)**

```sql
CREATE TABLE "course_instructors" (
  "course_id"     uuid NOT NULL,
  "instructor_id" uuid NOT NULL,
  "role"          varchar(50) NOT NULL DEFAULT 'primary', -- primary | co_instructor | guest
  "display_order" smallint    NOT NULL DEFAULT 0,
  "created_at"    timestamptz NOT NULL DEFAULT (now()),
  PRIMARY KEY ("course_id", "instructor_id")
);

ALTER TABLE "course_instructors" ADD FOREIGN KEY ("course_id")     REFERENCES "courses" ("id") ON DELETE CASCADE;
ALTER TABLE "course_instructors" ADD FOREIGN KEY ("instructor_id") REFERENCES "instructors" ("id");

-- Enforce exactly one primary instructor per course
CREATE UNIQUE INDEX one_primary_per_course
  ON "course_instructors" ("course_id")
  WHERE "role" = 'primary';

CREATE INDEX ON "course_instructors" ("instructor_id");
```

**`instructor_expertise` — M2M with master data**

```sql
CREATE TABLE "instructor_expertise" (
  "instructor_id"     uuid NOT NULL,
  "expertise_code_id" uuid NOT NULL,
  PRIMARY KEY ("instructor_id", "expertise_code_id")
);

ALTER TABLE "instructor_expertise" ADD FOREIGN KEY ("instructor_id")     REFERENCES "instructors" ("id") ON DELETE CASCADE;
ALTER TABLE "instructor_expertise" ADD FOREIGN KEY ("expertise_code_id") REFERENCES "master_data_code" ("id");
```

**`instructor_social_links`**

```sql
CREATE TABLE "instructor_social_links" (
  "id"            uuid PRIMARY KEY,
  "instructor_id" uuid NOT NULL,
  "platform"      varchar(50) NOT NULL,  -- linkedin | facebook | youtube | website | github | twitter
  "url"           text        NOT NULL,
  "display_order" smallint    NOT NULL DEFAULT 0
);

ALTER TABLE "instructor_social_links" ADD FOREIGN KEY ("instructor_id") REFERENCES "instructors" ("id") ON DELETE CASCADE;
```

#### 2.1.2 Modify existing `courses` table

```sql
-- Drop the old direct FK (courses.instructor_id → users)
ALTER TABLE "courses" DROP CONSTRAINT courses_instructor_id_fkey;
ALTER TABLE "courses" DROP COLUMN "instructor_id";
```

> **Migration data step** (run BEFORE dropping the column if the DB already has data):
> For each row in `courses` where `instructor_id IS NOT NULL`, insert one row into `instructors` (copy `full_name`, `profile_picture_url` from `users`) and one row into `course_instructors(course_id, instructor_id, role='primary', display_order=0)`. Then drop the column.

#### 2.1.3 Master Data seed (new group)

```sql
-- New master data group for instructor expertise
INSERT INTO master_data_group (id, group_key, name, description, is_active, display_order)
VALUES (gen_random_uuid(), 'expertise_area', 'Instructor Expertise Area',
        'Areas of expertise for instructors', true, 0);

-- Seed a few codes (data_analytics, supply_chain, software_dev, digital_marketing, ...)
```

#### 2.1.4 Permissions seed (new module)

```sql
INSERT INTO modules (id, name, label)
VALUES (gen_random_uuid(), 'instructors', 'Instructors');

-- Then create 4 permissions for actions: view, create, edit, delete
-- (bind through role_permissions to the Admin role)
```

#### 2.1.5 Triggers / async jobs (to keep denormalized counters correct)

- On `course_instructors` INSERT/DELETE → recompute `instructors.total_courses` for affected instructor(s).
- On `enrollments` INSERT/DELETE or status change → recompute `instructors.total_students` for the course's instructors.
- On `course_ratings` INSERT/UPDATE → recompute `instructors.avg_rating` (weighted average of `courses.avg_rating` for that instructor's assigned & published courses).
- Alternative: nightly job if trigger latency is acceptable.

#### 2.1.6 Additional constraints & indexes (recommended)

```sql
-- CHECK the role column
ALTER TABLE "course_instructors"
  ADD CONSTRAINT ck_course_instructors_role
  CHECK ("role" IN ('primary', 'co_instructor', 'guest'));

-- Support catalog filter "instructors that have at least 1 published course"
CREATE INDEX ON "course_instructors" ("instructor_id", "course_id");
```

### 2.2 API changes

#### 2.2.1 New endpoints (Admin — protected by `instructors.*` permissions)

| Method | Path | Purpose | Permission |
|---|---|---|---|
| `GET`    | `/api/admin/instructors`                    | List with search (`q`), filter (`status`, `expertise_id`), sort, pagination | `instructors.view` |
| `GET`    | `/api/admin/instructors/{id}`               | Detail (profile + expertise + social + counters) | `instructors.view` |
| `GET`    | `/api/admin/instructors/{id}/courses`       | Courses assigned to this instructor | `instructors.view` |
| `GET`    | `/api/admin/instructors/{id}/stats`         | Aggregated stats (students, ratings, completion rate) | `instructors.view` |
| `POST`   | `/api/admin/instructors`                    | Create (full_name required; slug auto if omitted) | `instructors.create` |
| `PUT`    | `/api/admin/instructors/{id}`               | Update profile fields, expertise list, social links | `instructors.edit` |
| `PATCH`  | `/api/admin/instructors/{id}/status`        | Activate / deactivate | `instructors.edit` |
| `PATCH`  | `/api/admin/instructors/{id}/link-user`     | Link (or unlink) a `users` record | `instructors.edit` |
| `DELETE` | `/api/admin/instructors/{id}`               | Delete — must return 409 if any `course_instructors` row exists | `instructors.delete` |

#### 2.2.2 Existing endpoints to CHANGE

| Endpoint | Change |
|---|---|
| `POST /api/admin/courses` (create) | Request body: replace single `instructor_id` (user FK) with `primary_instructor_id` (instructors FK) + optional `co_instructor_ids: uuid[]`. On save, insert into `course_instructors` accordingly. |
| `PUT /api/admin/courses/{id}` (edit) | Same shape as create. On update, diff the `course_instructors` set (add new, remove missing, keep unchanged). Enforce exactly one primary. |
| `GET /api/admin/courses/{id}` | Response: replace `instructor: { id, full_name }` (from `users`) with `primary_instructor: {...}` + `co_instructors: [...]` (from `instructors`). |
| `GET /api/courses` (student catalog) | Response cards: include `primary_instructor: { id, full_name, slug, profile_picture_url }`. Add `?instructor_id=` filter. |
| `GET /api/courses/{slug}` (student overview) | Response: return full `primary_instructor` + `co_instructors` arrays with `headline`, `bio`, `expertise[]`, `social_links[]`. |
| `GET /api/admin/dashboard/courses` | Add optional `?instructor_id=` filter; add `top_instructors` block in aggregate response. |
| `GET /api/admin/master-data/*` | No breaking change — the new `expertise_area` group is served by the same generic master data endpoints. |

#### 2.2.3 Validation & business rules (BE-enforced)

- `full_name` required, 1–200 chars.
- `slug` auto-generated from `full_name` (kebab-case, ASCII-fold Vietnamese), suffix random `-xxxx` on collision. Unique.
- On `PUT`, refuse `slug` change if instructor already has ≥1 course with `status = 'published'` (return `409 slug_locked`).
- `email_public` optional; if provided, must be a valid email (does NOT need to match `users.email`).
- `user_id` link: enforce uniqueness (1 user ↔ 1 instructor). Attempting to link an already-linked user returns `409 user_already_linked`.
- Deactivation (`is_active = false`) does NOT remove existing course assignments; only blocks new assignments in `ADM_CRS_14`.
- Delete: allowed only when `SELECT count(*) FROM course_instructors WHERE instructor_id = ? = 0`. Otherwise `409 has_assigned_courses` with count in payload.
- When assigning instructors to a course, BE MUST enforce:
  - Exactly one row with `role = 'primary'` per course (DB unique index + application check).
  - `co_instructor_ids` cannot contain the primary id.
  - All instructor ids must be `is_active = true` OR already assigned to the course (allow keeping legacy inactive ones).

#### 2.2.4 DTO reference (BE authoritative)

```jsonc
// InstructorDetailDTO (response)
{
  "id": "uuid",
  "user_id": "uuid|null",
  "slug": "nguyen-van-a",
  "full_name": "Nguyễn Văn A",
  "headline": "Senior Data Analyst @ VNG",
  "bio": "<p>…</p>",
  "profile_picture_url": "https://…",
  "email_public": "a@example.com",
  "years_of_experience": 7,
  "is_active": true,
  "expertise": [ { "id": "uuid", "code": "data_analytics", "name": "Data Analytics" } ],
  "social_links": [ { "platform": "linkedin", "url": "https://…" } ],
  "stats": {
    "total_courses": 3,
    "total_students": 412,
    "avg_rating": 4.75
  },
  "created_at": "2026-08-29T14:00:00Z",
  "updated_at": "2026-08-29T14:00:00Z"
}
```

```jsonc
// CreateInstructorRequest
{
  "full_name": "Nguyễn Văn A",
  "headline": "…",
  "bio": "<p>…</p>",
  "profile_picture_url": "https://…",
  "email_public": "…",
  "years_of_experience": 7,
  "expertise_code_ids": ["uuid", "uuid"],
  "social_links": [ { "platform": "linkedin", "url": "https://…" } ],
  "user_id": "uuid|null",
  "is_active": true
}
```

```jsonc
// Course create/update payload — instructor block
{
  "primary_instructor_id": "uuid",
  "co_instructor_ids": ["uuid", "uuid"]
}
```

### 2.3 Schemas / files to update

- `DNA-academy.sql` — add the 4 new tables, drop `courses.instructor_id`, add new indexes/constraints (see 2.1).
- ORM models (e.g. Prisma / TypeORM / SQLAlchemy):
  - Add `Instructor`, `CourseInstructor`, `InstructorExpertise`, `InstructorSocialLink` models.
  - Remove `Course.instructor` (user relation); add `Course.primaryInstructor` (computed / view) and `Course.instructors` (M2M relation).
- Seed scripts: add `expertise_area` group + codes, `instructors` module + 4 permissions.
- Migration: one forward migration named `2026_08_add_instructor_management.sql` implementing sections 2.1.1 → 2.1.6 in a single transaction, plus a data backfill step.

---

## 3. FE Work

### 3.1 Screens summary

| Screen ID | Action | Notes |
|---|---|---|
| **`ADM_INS_19`** *(NEW)* | **Add new screen** | Instructor Management, master-detail layout in a single route |
| `ADM_SHL_11` | Modify (light) | Add sidebar item "Instructors" pointing to `/admin/instructors`; visibility gated by `instructors.view` |
| `ADM_ROL_12` | Data only | Renders the new `instructors` module automatically — no code change |
| `ADM_MAS_13` | Data only | Renders the new `expertise_area` master data group automatically — no code change |
| `ADM_CRS_14` | Modify | Replace single instructor dropdown with primary picker + co-instructor multi-select; add "+ New Instructor" inline creation |
| `ADM_DCR_17` | Modify | Add "By Instructor" filter + "Top Instructors" widget |
| `STU_CAT_03` | Modify | Load instructor filter options from `/api/admin/instructors` (public projection); course card shows primary instructor |
| `STU_OVR_04` | Modify | Replace plain instructor text with `<InstructorCard>` + `<InstructorProfileDrawer>`; render co-instructors below |
| All other screens (`ALL_SGN_01`, `STU_PRO_02`, `STU_MYC_05`, `STU_PLV_06`, `STU_PLA_07`, `STU_PLQ_08`, `STU_PLR_09`, `STU_CER_10`, `ADM_CUR_15`, `ADM_PRV_16`, `ADM_DRF_18`) | Not affected | — |

### 3.2 New screen `ADM_INS_19` — Instructor Management

**Route:** `/admin/instructors`
**Layout:** master-detail, single-route.

- **Left pane — Instructor List**
  - Search box (name / headline).
  - Filters: `Status` (Active / Inactive / All), `Expertise` (multi-select from `expertise_area` master data).
  - Sort: name, total_courses, avg_rating, created_at.
  - Pagination.
  - Each row: avatar, name, headline (truncated), total_courses, avg_rating, active toggle.
  - Empty state: "No instructors yet — click + Add Instructor to create the first one."

- **Right pane — Detail / Form** (opens on row click or `+ Add`)
  - Tabs: **Profile** (default) · **Courses** · **Stats**.
  - **Profile tab (form):**
    - Avatar uploader (R2 upload → returns URL, sets `profile_picture_url`).
    - `full_name` (required), `headline`, `slug` (auto, read-only after courses published), `email_public`, `years_of_experience`.
    - `bio` rich-text editor (TipTap or equivalent).
    - `expertise` multi-select (loaded from master data group `expertise_area`).
    - `social_links` dynamic list with `platform` dropdown + `url` input + add/remove.
    - `user_id` link — searchable user picker (optional).
    - `is_active` toggle.
    - Buttons: **Save**, **Deactivate/Activate**, **Delete** (disabled with tooltip when instructor has ≥1 assigned course).
  - **Courses tab:** table of courses this instructor is assigned to (title, status, role in course, enrollment count); click row → open `ADM_CRS_14` for that course.
  - **Stats tab:** cards for `total_courses`, `total_students`, `avg_rating`; small bar chart of enrollments over last 6 months (reuse dashboard chart component).

- **Validation states**
  - Show inline field errors from BE (`400` responses with field-level messages).
  - Delete conflict → toast: "Cannot delete: instructor is assigned to N course(s). Reassign or remove first."
  - Slug-locked (published course) → toast when user tries to edit slug: "Slug is locked because at least one published course uses it."

### 3.3 Modifications to existing screens

#### `ADM_SHL_11` Admin Shell
- Add sidebar menu item `Instructors` (icon: user tie) between `Courses` and `Master Data`.
- Route: `/admin/instructors`. Show only if user has `instructors.view` permission.

#### `ADM_CRS_14` Course Creation
- Replace old "Instructor" single-select with:
  - **Primary Instructor** — required, single-select combobox (loads from `/api/admin/instructors?status=active`).
  - **Co-instructors** — optional multi-select combobox; excludes the primary from choices.
  - "+ New Instructor" button opens `<InstructorPickerModal>` in create mode; on save, the new instructor is auto-selected as primary (or added to co-instructors depending on which field opened the modal).
- On submit, send `primary_instructor_id` and `co_instructor_ids` in the course payload (see 2.2.4).
- On edit, prefill both fields from the course detail response.
- Validation: form cannot submit without a primary instructor.

#### `ADM_DCR_17` Course Dashboard
- Add filter dropdown **Instructor** (loads from `/api/admin/instructors`).
- Add new dashboard card **Top Instructors** — table of top N by `total_students` and `avg_rating`.
- When filter is applied, all existing metrics scope to that instructor's courses.

#### `STU_CAT_03` Course Catalog
- Filter panel: **Instructor** dropdown now loads from `/api/admin/instructors` (public projection: id, name, slug, avatar).
- Course card: show `primary_instructor.full_name`; if `co_instructors.length > 0`, append `+ N others`.
- URL query param: `?instructor_id=<uuid>` scopes results.

#### `STU_OVR_04` Course Overview
- Replace the plain "Instructor: X" text with `<InstructorCard>` block (avatar + name + headline + short bio + social icons).
- Clicking the card opens `<InstructorProfileDrawer>` (side drawer) showing full bio, expertise, social links, and the list of other courses by this instructor.
- If the course has co-instructors, render them as smaller cards under the primary.

### 3.4 New shared FE components

- `<InstructorCard />` — avatar + name + headline + short bio + social icons. Props: `instructor`, `variant: 'primary' | 'co'`.
- `<InstructorProfileDrawer />` — side drawer showing the full profile plus a list of other courses by that instructor.
- `<InstructorPickerModal />` — searchable modal used inside `ADM_CRS_14`; supports "Create new" inline.
- `<InstructorAvatarStack />` — overlapping avatars for course cards with multiple instructors.
- `<InstructorSelect />` — single-select combobox with server-side search (used by primary picker and dashboard filter).
- `<InstructorMultiSelect />` — multi-select combobox (co-instructor field).

### 3.5 State & routing

- Add `instructorsSlice` (Redux/Zustand/Pinia) with:
  - `list` (paginated), `detail(id)`, `stats(id)`, filter state.
  - Cached list keyed by filter/sort/page for fast re-render in `ADM_CRS_14` picker.
- Routes:
  - `/admin/instructors` → `ADM_INS_19` (master-detail; selected instructor id kept in query `?id=`).
  - No public `/instructors/:slug` route in V1 — the drawer inside `STU_OVR_04` covers the need.
- Permission guard: `<RequirePermission perm="instructors.view">` wrapping the route.

### 3.6 UX / edge cases

- Deactivated instructors: greyed avatar + "Inactive" chip; excluded from `ADM_CRS_14` pickers unless already assigned to that course.
- Deleting instructor with assigned courses: block at UI level (button disabled with tooltip) and also handle 409 gracefully.
- Editing a slug that is locked: input disabled with lock icon + tooltip explaining why.
- Instructor with no `bio` / no `headline` on `STU_OVR_04`: hide the empty section entirely rather than showing placeholder text.
- I18n: `bio` and `headline` remain single-language in V1 (matches the current course description model).

### 3.7 Analytics / tracking events

- `admin_instructor_created`, `admin_instructor_updated`, `admin_instructor_deleted`, `admin_instructor_status_toggled`.
- `admin_course_instructor_assigned` (with role: primary / co).
- `student_instructor_profile_opened` (from `STU_OVR_04` drawer) — includes `instructor_id`, `course_id`.
- `student_catalog_filtered_by_instructor` (from `STU_CAT_03`).

---

## 4. API Integration

> Filled in by BE. All paths are prefixed with `/api/v1`. Admin routes require a
> `Bearer` JWT **and** the listed permission (`instructors.*` / `courses.*`);
> a missing permission returns `403 { code: "PERMISSION_DENIED", required }`.
> Request/response bodies are **camelCase**, matching the rest of the codebase
> (the snake_case examples in §2.2.4 are illustrative, not the wire format).

### 4.1 Endpoint map

| FE screen / component | Method | Endpoint | Request shape | Response shape | Error codes |
|---|---|---|---|---|---|
| `ADM_INS_19` list | `GET` | `/admin/instructors` | query: `q`, `status` (`active`\|`inactive`\|`all`), `expertiseId`, `sortBy` (`fullName`\|`totalCourses`\|`totalStudents`\|`avgRating`\|`displayOrder`\|`createdAt`), `sortOrder` (`asc`\|`desc`), `page`, `limit` (max 50) | `{ data: InstructorListItem[], totalCount, page, limit, hasNextPage }` | 401, 403, 422 (bad `sortBy`) |
| `ADM_INS_19` detail | `GET` | `/admin/instructors/{id}` | — | `InstructorDetail` | 401, 403, 404 |
| `ADM_INS_19` Courses tab | `GET` | `/admin/instructors/{id}/courses` | — | `InstructorCourse[]` | 401, 403, 404 |
| `ADM_INS_19` Stats tab | `GET` | `/admin/instructors/{id}/stats` | — | `{ totalCourses, publishedCourses, totalStudents, avgRating }` | 401, 403, 404 |
| `ADM_INS_19` create | `POST` | `/admin/instructors` | `CreateInstructor` | `InstructorDetail` (201) | 401, 403, 409 `user_already_linked`, 422 |
| `ADM_INS_19` update | `PUT` | `/admin/instructors/{id}` | `CreateInstructor` (all fields optional) | `InstructorDetail` | 401, 403, 404, 409 `slug_locked` / `user_already_linked`, 422 |
| `ADM_INS_19` activate/deactivate | `PATCH` | `/admin/instructors/{id}/status` | `{ isActive: boolean }` | `InstructorDetail` | 401, 403, 404 |
| `ADM_INS_19` link user | `PATCH` | `/admin/instructors/{id}/link-user` | `{ userId: number \| null }` | `InstructorDetail` | 401, 403, 404, 409 `user_already_linked`, 422 `{ userId: "notExists" }` |
| `ADM_INS_19` delete | `DELETE` | `/admin/instructors/{id}` | — | `204 No Content` | 401, 403, 404, 409 `has_assigned_courses` |
| `ADM_CRS_14` primary picker | `GET` | `/admin/instructors?status=active&q=` | see list row | `InstructorListItem[]` | 401, 403 |
| `ADM_CRS_14` co-instructor picker | `GET` | `/admin/instructors?status=active&q=` | same as above | same as above | 401, 403 |
| `ADM_CRS_14` submit (create) | `POST` | `/admin/courses` | existing body **+** `primaryInstructorId?`, `coInstructorIds?` | `Course` | 422 (see §4.4) |
| `ADM_CRS_14` submit (update) | `PATCH` | `/admin/courses/{id}` | same instructor block | `Course` | 404, 422 |
| `ADM_CRS_14` prefill | `GET` | `/admin/courses/{id}` | — | existing detail **+** `primaryInstructor`, `coInstructors` | 401, 403, 404 |
| `ADM_DCR_17` instructor filter | `GET` | `/admin/courses?instructorId={uuid}` | — | paginated `Course[]` | 401, 403 |
| `ADM_DCR_17` top instructors widget | — | **not implemented** | — | — | — |
| `STU_CAT_03` filter options | `GET` | `/instructors` *(public, no auth)* | query: `q`, `hasPublishedCourse` (default `true`), `page`, `limit` (max 100) | `InstructorRef[]` | — |
| `STU_CAT_03` catalog | `GET` | `/courses?instructorId={uuid}` | existing filters | cards carry `primaryInstructor: InstructorRef \| null` and `coInstructorCount: number` | — |
| `STU_OVR_04` overview | `GET` | `/courses/{slug}` | — | `primaryInstructor: InstructorProfile \| null`, `coInstructors: InstructorProfile[]` | 404 |

### 4.2 Response shapes

```jsonc
// InstructorRef — cards, pickers, course payloads
{ "id": "uuid", "slug": "nguyen-van-a", "fullName": "Nguyễn Văn A",
  "headline": "Senior Data Analyst @ VNG", "profilePictureUrl": "https://…" }

// InstructorListItem = InstructorRef + …
{ "isActive": true, "displayOrder": 0,
  "totalCourses": 3, "totalStudents": 412, "avgRating": 4.75 }

// InstructorProfile = InstructorRef + …  (student drawer)
{ "bio": "<p>…</p>", "yearsOfExperience": 7,
  "expertise": [ { "id": "uuid", "code": "data_analytics", "name": "Data Analytics" } ],
  "socialLinks": [ { "platform": "linkedin", "url": "https://…", "displayOrder": 0 } ] }

// InstructorDetail = InstructorListItem + …  (admin detail)
{ "userId": 42, "bio": "<p>…</p>", "emailPublic": "a@example.com",
  "yearsOfExperience": 7, "expertise": [ … ], "socialLinks": [ … ],
  "stats": { "totalCourses": 3, "totalStudents": 412, "avgRating": 4.75 },
  "createdAt": "2026-08-29T14:00:00Z", "updatedAt": "2026-08-29T14:00:00Z" }

// InstructorCourse — Courses tab
{ "id": "uuid", "title": "…", "slug": "…", "status": "published",
  "role": "primary", "totalEnrollments": 128 }

// CreateInstructor — request
{ "fullName": "Nguyễn Văn A", "slug": "nguyen-van-a", "headline": "…",
  "bio": "<p>…</p>", "profilePictureUrl": "https://…",
  "emailPublic": "a@example.com", "yearsOfExperience": 7,
  "displayOrder": 0, "isActive": true,
  "expertiseCodeIds": ["uuid"],
  "socialLinks": [ { "platform": "linkedin", "url": "https://…", "displayOrder": 0 } ],
  "userId": 42 }
```

### 4.3 PUT semantics for the collection fields

`expertiseCodeIds` and `socialLinks` **replace the whole set** when the key is
present, are **left untouched** when the key is omitted, and are **cleared** by
an empty array. Everything else is a normal partial update.

### 4.4 Error payloads

| HTTP | Body | Raised when |
|---|---|---|
| `409` | `{ error: "has_assigned_courses", assignedCoursesCount: N }` | `DELETE /admin/instructors/{id}` with ≥1 `course_instructor` row |
| `409` | `{ error: "slug_locked", publishedCoursesCount: N }` | slug change while ≥1 assigned course is `published` |
| `409` | `{ error: "user_already_linked", instructorId: "uuid" }` | linking a user another instructor already holds |
| `422` | `{ errors: { slug: "alreadyExists" } }` | explicit slug already taken |
| `422` | `{ errors: { userId: "notExists" } }` | unknown user id |
| `422` | `{ errors: { expertiseCodeIds: "notExists:<id>" } }` | code missing, inactive, or outside `expertise_area` |
| `422` | `{ errors: { primaryInstructorId: "required" } }` | co-instructors sent with no primary |
| `422` | `{ errors: { coInstructorIds: "duplicatePrimary" } }` | co-instructor list repeats the primary |
| `422` | `{ errors: { primaryInstructorId: "notExists:<id>" } }` | unknown instructor id |
| `422` | `{ errors: { coInstructorIds: "inactive:<id>" } }` | deactivated instructor not already on the course |
| `422` | `{ missingItems: ["primaryInstructor", …] }` | `POST /admin/courses/{id}/publish` without a primary instructor |

### 4.5 Notes for FE

- **Slug** is generated from `fullName` (ASCII-folded kebab-case) and suffixed
  `-2` / `-3` on collision — **not** the random `-xxxx` of §2.2.3.
- **`primaryInstructorId` is optional on create/update** so a draft can be
  saved before the instructor exists, but it is a **publish-blocking**
  checklist item. `ADM_CRS_14` should still require it client-side.
- Sending only `primaryInstructorId` keeps the existing co-instructors; send
  `coInstructorIds: []` to clear them.
- `avgRating` is `numeric(3,2)` (2 decimals) and is an enrollment-weighted mean
  over the instructor's **published** courses; `null` when none is rated.
- `GET /instructors` is the public catalog-filter source. §3.3's suggestion to
  call `/admin/instructors` from `STU_CAT_03` does not work for guests.

## 5. Acceptance Criteria (Epic-level)

Written in BDD style, matching the requirement PDF format.

**AC-1 — Instructor CRUD**
- **Given** the admin has `instructors.create` permission
  **When** the admin submits a valid instructor form on `ADM_INS_19`
  **Then** the system creates the instructor, generates a unique slug, and displays it in the list.
- **Given** an existing instructor is displayed
  **When** the admin edits fields and saves
  **Then** the system updates the instructor and reflects changes wherever the instructor is displayed.
- **Given** an instructor has zero assigned courses
  **When** the admin deletes and confirms
  **Then** the system removes the instructor.
- **Given** an instructor has one or more assigned courses
  **When** the admin attempts to delete
  **Then** the system prevents deletion and informs the admin that the instructor must first be unassigned.

**AC-2 — Course assignment**
- **Given** the admin is on `ADM_CRS_14`
  **When** the admin opens the Primary Instructor field
  **Then** the system displays all active instructors.
- **Given** a course is being saved
  **When** no primary instructor is selected
  **Then** the system blocks save and highlights the field.
- **Given** a co-instructor list is being edited
  **When** the admin adds the primary as a co-instructor
  **Then** the system prevents the duplicate and shows a validation message.

**AC-3 — Discovery**
- **Given** a published course has a primary instructor
  **When** a student views the course catalog
  **Then** the course card displays the primary instructor's name.
- **Given** a student is on `STU_OVR_04`
  **When** the student clicks the instructor card
  **Then** the system opens the instructor profile drawer with full details.
- **Given** the student applies an instructor filter on `STU_CAT_03`
  **When** the filter is applied
  **Then** only courses linked to that instructor via `course_instructors` are displayed.

**AC-4 — Deactivation**
- **Given** an instructor is deactivated
  **When** the admin creates a new course
  **Then** the deactivated instructor does not appear in the picker.
- **Given** an instructor is deactivated
  **When** an existing course still references them
  **Then** the assignment is preserved and the course keeps functioning.

**AC-5 — Link to user account (optional)**
- **Given** an instructor is not yet linked
  **When** the admin selects a user in the link field
  **Then** the system links the two records if the user is not already linked elsewhere.
- **Given** a user is already linked to another instructor
  **When** the admin tries to link them again
  **Then** the system rejects the change with a clear message.

---

## 6. Out of Scope (V1)

- Public SEO-friendly instructor pages `/instructors/{slug}` (can be added later without schema change — slug is already unique).
- Instructor self-service portal (login as instructor, edit own bio, view own dashboard).
- Per-instructor rating separate from course rating (Udemy-style).
- Revenue share / payout data.
- Multi-language `bio` / `headline` fields.
