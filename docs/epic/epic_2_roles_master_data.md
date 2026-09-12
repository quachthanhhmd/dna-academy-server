# Epic 2 — Roles, Permissions & Master Data

## Stack
- **BE**: NestJS (brocoders/nestjs-boilerplate, relational/PostgreSQL variant)
- **FE**: Next.js (brocoders/extensive-react-boilerplate)
- **DB**: PostgreSQL via TypeORM

## DB Tables Involved
- `roles` — admin-defined roles
- `modules` — system feature modules (seeded)
- `permissions` — module × action pairs (seeded)
- `role_permissions` — M2M role ↔ permission
- `user_roles` — M2M user ↔ role
- `master_data_group` — defines a data type (e.g. "Course Level")
- `master_data_code` — values under each group (e.g. "Beginner")

---

## BE Tasks

### 1. Roles CRUD

**Generate entities:**
```
npm run generate:resource:relational -- --name Role
npm run add:property:to-relational -- --name Role --property name --kind primitive --type string --isAddToDto true --isOptional false --isNullable false
npm run add:property:to-relational -- --name Role --property description --kind primitive --type string --isAddToDto true --isOptional true --isNullable true
npm run add:property:to-relational -- --name Role --property isActive --kind primitive --type boolean --isAddToDto true --isOptional false --isNullable false

npm run generate:resource:relational -- --name Module
npm run add:property:to-relational -- --name Module --property name --kind primitive --type string --isAddToDto true --isOptional false --isNullable false
npm run add:property:to-relational -- --name Module --property label --kind primitive --type string --isAddToDto true --isOptional true --isNullable true

npm run generate:resource:relational -- --name Permission
npm run add:property:to-relational -- --name Permission --property action --kind primitive --type string --isAddToDto true --isOptional false --isNullable false
npm run add:property:to-relational -- --name Permission --property label --kind primitive --type string --isAddToDto true --isOptional true --isNullable true
npm run add:property:to-relational -- --name Permission --property module --kind reference --type Module --referenceType manyToOne --isAddToDto true --isOptional false --isNullable false --shouldAutoLoad true
```

**Endpoints `RolesModule`:**

`GET /admin/roles` — list all roles with `{ id, name, description, isActive, assignedUsersCount }`
- `assignedUsersCount`: subquery COUNT from `user_roles`

`POST /admin/roles` — create role
- Validate unique name → 409 if duplicate

`PATCH /admin/roles/:id` — update name, description, isActive

`DELETE /admin/roles/:id`
- Check `user_roles` — if role has assigned users → 409 `{ code: 'ROLE_HAS_USERS' }`
- If no users → delete role + cascade delete `role_permissions`

---

### 2. Role Permissions Assignment

`GET /admin/roles/:id/permissions`
- Return all `permissions` grouped by module: `{ module: { id, name, label }, permissions: [...] }[]`
- Mark `isGranted: true/false` based on `role_permissions` for this role

`PUT /admin/roles/:id/permissions`
- Accept `{ permissionIds: string[] }`
- Replace all `role_permissions` for this role

---

### 3. User Role Assignment

`GET /admin/users/:id/roles` — list roles assigned to user

`PUT /admin/users/:id/roles`
- Accept `{ roleIds: string[] }`
- Replace `user_roles` for this user

---

### 4. Permission Guard

Create `PermissionGuard` (NestJS Guard + `@RequirePermission(module, action)` decorator):
- Load user's roles → flatten permissions via `role_permissions`
- Check if required `(module, action)` pair exists
- Attach to all `/admin/**` routes

**Seed data** (migration file):
```typescript
// Modules: master_data, courses, dashboard, users, roles
// Permissions per module: view, create, edit, delete, export, publish
// Default 'Super Admin' role with all permissions
```

---

### 5. Master Data — Groups & Codes

**Generate entities:**
```
npm run generate:resource:relational -- --name MasterDataGroup
npm run add:property:to-relational -- --name MasterDataGroup --property groupKey --kind primitive --type string --isAddToDto true --isOptional false --isNullable false
npm run add:property:to-relational -- --name MasterDataGroup --property name --kind primitive --type string --isAddToDto true --isOptional false --isNullable false
npm run add:property:to-relational -- --name MasterDataGroup --property description --kind primitive --type string --isAddToDto true --isOptional true --isNullable true
npm run add:property:to-relational -- --name MasterDataGroup --property isActive --kind primitive --type boolean --isAddToDto true --isOptional false --isNullable false
npm run add:property:to-relational -- --name MasterDataGroup --property displayOrder --kind primitive --type number --isAddToDto true --isOptional false --isNullable false

npm run generate:resource:relational -- --name MasterDataCode
npm run add:property:to-relational -- --name MasterDataCode --property code --kind primitive --type string --isAddToDto true --isOptional false --isNullable false
npm run add:property:to-relational -- --name MasterDataCode --property name --kind primitive --type string --isAddToDto true --isOptional false --isNullable false
npm run add:property:to-relational -- --name MasterDataCode --property description --kind primitive --type string --isAddToDto true --isOptional true --isNullable true
npm run add:property:to-relational -- --name MasterDataCode --property thumbnailUrl --kind primitive --type string --isAddToDto true --isOptional true --isNullable true
npm run add:property:to-relational -- --name MasterDataCode --property isActive --kind primitive --type boolean --isAddToDto true --isOptional false --isNullable false
npm run add:property:to-relational -- --name MasterDataCode --property displayOrder --kind primitive --type number --isAddToDto true --isOptional false --isNullable false
npm run add:property:to-relational -- --name MasterDataCode --property group --kind reference --type MasterDataGroup --referenceType manyToOne --isAddToDto true --isOptional false --isNullable false --shouldAutoLoad false
```

**V1 NOTE**: Per requirement — *"V1 need to hard the group_key code in the database, improve later"*
Seed `master_data_group` rows at startup with fixed `group_key` values:
- `course_group`, `course_level`, `course_category`, `lecture_type`, `course_status`
- `education_stage`, `career_interest`
Admin can manage **codes** (add/edit/deactivate) but NOT add/delete groups in V1.

**Endpoints `MasterDataModule`:**

`GET /admin/master-data/groups` — list all groups (seeded, read-only in V1)

`GET /admin/master-data/groups/:groupKey/codes`
- Return codes for a group with: `{ id, code, name, description, thumbnailUrl, isActive, displayOrder, linkedCoursesCount }`
- `linkedCoursesCount`: subquery count from `course_group_assignments` or `courses.level_id / category_id`

`POST /admin/master-data/groups/:groupKey/codes` — create new code
- Validate unique `(group_id, name)` → 409 if duplicate
- `thumbnailUrl` is a plain string: the image is uploaded first via
  `POST /api/v1/files/upload` (Cloudflare R2 — see Epic 3 §0 of the API guide),
  and the returned `file.path` is stored here

`PATCH /admin/master-data/groups/:groupKey/codes/:id` — update code

`PATCH /admin/master-data/groups/:groupKey/codes/:id/deactivate`
- Set `is_active = false`
- Existing course relations remain stored, code is no longer selectable for new assignments

**Public endpoint (for FE dropdowns / onboarding):**

`GET /master-data/codes?groupKey={key}` — return active codes for a group (no auth)

---

## FE Tasks

### Admin Pages

**`/admin/roles`** — Role list page
- Table: Role name | Description | Status | Assigned Users | Actions
- "Create Role" button → modal/drawer with name + description fields
- Edit role → same modal pre-populated
- Delete role → confirm dialog; if role has users show error message

**`/admin/roles/:id/permissions`** — Permission configuration page
- Grouped by module (accordion or table)
- Checkbox grid: each row = permission action (view/create/edit/delete/export/publish)
- "Save" → `PUT /admin/roles/:id/permissions`

**`/admin/master-data`** — Master Data page
- Left sidebar: list of groups (Course Group, Course Level, Course Category, Lecture Type, Course Status)
- Right panel: code list table for selected group
  - Columns: Name | Description | Thumbnail | Status | Display Order | Linked Courses | Actions
  - "Add" button → inline form or modal: name, description, thumbnail URL, display order
  - Toggle active/inactive
  - Edit inline or modal

---

## API Contract Summary

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/admin/roles` | Admin | List all roles |
| POST | `/admin/roles` | Admin | Create role |
| PATCH | `/admin/roles/:id` | Admin | Update role |
| DELETE | `/admin/roles/:id` | Admin | Delete role (if no users) |
| GET | `/admin/roles/:id/permissions` | Admin | Get role permissions |
| PUT | `/admin/roles/:id/permissions` | Admin | Set role permissions |
| GET | `/admin/users/:id/roles` | Admin | List a user's roles |
| PUT | `/admin/users/:id/roles` | Admin | Replace a user's roles |
| GET | `/admin/master-data/groups` | Admin | List groups |
| GET | `/admin/master-data/groups/:groupKey/codes` | Admin | List codes for group |
| POST | `/admin/master-data/groups/:groupKey/codes` | Admin | Create code |
| PATCH | `/admin/master-data/groups/:groupKey/codes/:id` | Admin | Update code |
| PATCH | `/admin/master-data/groups/:groupKey/codes/:id/deactivate` | Admin | Deactivate code |
| GET | `/master-data/codes` | None | Public: get active codes by groupKey |

---

## Acceptance Criteria Mapping

| Requirement | Implementation |
|---|---|
| Display role name, description, status, assigned user count | `GET /admin/roles` includes `assignedUsersCount` |
| Prevent duplicate role name | `POST /admin/roles` → 409 on duplicate |
| Prevent delete if role has assigned users | `DELETE /admin/roles/:id` → 409 if users exist |
| Permissions grouped by module/feature | `GET /admin/roles/:id/permissions` returns grouped structure |
| Master data page shows groups: Course Group, Lecture Type, etc. | Seeded `master_data_group` rows |
| Show code list with name, description, status, display order, linked courses | `GET .../codes` includes `linkedCoursesCount` |
| Deactivated code no longer selectable for new assignments | `is_active=false` filter on public `/master-data/codes` endpoint |
| Existing course links preserved after deactivation | Only `is_active` toggled, FK rows in `course_group_assignments` untouched |

---

## API Guide (for FE integration)

Everything below reflects the **actual running implementation** (verified against the source and the `test/admin/roles-admin`, `user-roles-admin`, `master-data-admin` e2e specs), not just the original spec above. Interactive docs: `http://localhost:3001/docs` · raw OpenAPI JSON: `http://localhost:3001/docs-json`.

### Conventions

- Base path: `/api/v1` (e.g. `http://localhost:3001/api/v1/admin/roles`).
- Auth: `Authorization: Bearer <token>` header. Missing/invalid JWT → `401`.
- Every `/admin/**` route below also requires a **permission**, granted through the role system (see §4). A logged-in user without it gets:
  ```json
  { "code": "PERMISSION_DENIED", "required": { "module": "roles", "action": "view" } }
  ```
  with status `403`. Use this to decide whether to render an admin nav item at all, not just to show an error.
- All bodies are JSON (`Content-Type: application/json`).
- **Validation / reference errors** (`422`):
  ```json
  { "status": 422, "errors": { "<field>": "<errorCode>" } }
  ```
- **Conflict errors** (`409`) come in two shapes — a field-level one and a code-level one:
  ```json
  { "status": 409, "errors": { "name": "roleNameExists" } }
  { "status": 409, "code": "ROLE_HAS_USERS" }
  ```
- **Not-found errors** (`404`): `{ "status": 404, "error": "roleNotFound" | "userNotFound" | "masterDataGroupNotFound" | "masterDataCodeNotFound" }`.
- **ID types differ per entity** — `role.id` and `user.id` are **numbers**; `permission.id`, `module.id`, `masterDataGroup.id`, `masterDataCode.id` are **UUID strings**. Sending a UUID where a number is expected returns `400` from `ParseIntPipe`, not `422`.
- ⚠️ **Nothing here is sorted or paginated by the server.** `GET /admin/roles`, `GET /admin/master-data/groups`, and the codes/permissions lists are all capped at the first **50** rows with no `page`/`limit` params and no `ORDER BY` (except codes, which are ordered by `displayOrder ASC`). Sort in the FE — groups by `displayOrder`, roles by `name`, permission modules/actions by your own preferred order.

### 1. Roles CRUD — `/admin/roles`

**`GET /admin/roles`** — permission `roles:view`. Response `200` is a **plain array** (not a pagination envelope):
```json
[
  { "id": 3, "name": "Super Admin", "description": "Full access to all admin panel modules and actions.", "isActive": true, "assignedUsersCount": 4 },
  { "id": 7, "name": "Content Editor", "description": "Can edit content", "isActive": true, "assignedUsersCount": 0 }
]
```
`assignedUsersCount` is a live count from `user_roles` — this is the "Assigned Users" column, and the number that decides whether delete will succeed.

**`POST /admin/roles`** — permission `roles:create`.
```json
{ "name": "Content Editor", "description": "Can edit content", "isActive": true }
```
- `name` required; `description` and `isActive` optional (`isActive` defaults to `true`).
- Duplicate name → `409 { errors: { name: "roleNameExists" } }`. The check is **exact-match, case-sensitive**, so `content editor` and `Content Editor` are both accepted — dedupe in the form if you don't want that.
- Response `201`: the `Role` object (no `assignedUsersCount` — it's a fresh role, so it's 0).

**`PATCH /admin/roles/:id`** — permission `roles:edit`. Any subset of `{ name, description, isActive }`. Renaming to a name another role holds → same `409`; renaming to its own current name is a no-op, not a conflict. Response `200`: updated `Role`.

**`DELETE /admin/roles/:id`** — permission `roles:delete`. Response **`204 No Content`** (no body).
- If any user still holds the role → `409 { code: "ROLE_HAS_USERS" }`. Nothing is deleted. The FE should offer "reassign those users first" and can link to the affected users via §3.
- On success the role's `role_permissions` rows are removed too.
- There is **no `GET /admin/roles/:id`** — the list endpoint is the only read. To confirm a role exists, `GET /admin/roles/:id/permissions` 404s when it doesn't.

### 2. Role permissions — `/admin/roles/:id/permissions`

**`GET /admin/roles/:id/permissions`** — permission `roles:view`. Returns **every** permission in the system, grouped by module, each flagged with whether this role has it. This is the whole checkbox grid in one call — no need to fetch a master permission list separately.

Response `200`:
```json
[
  {
    "module": { "id": "<uuid>", "name": "courses", "label": "Courses", "createdAt": "...", "updatedAt": "..." },
    "permissions": [
      { "id": "<uuid>", "action": "view",    "label": "View",    "isGranted": true  },
      { "id": "<uuid>", "action": "create",  "label": "Create",  "isGranted": false },
      { "id": "<uuid>", "action": "edit",    "label": "Edit",    "isGranted": false },
      { "id": "<uuid>", "action": "delete",  "label": "Delete",  "isGranted": false },
      { "id": "<uuid>", "action": "export",  "label": "Export",  "isGranted": false },
      { "id": "<uuid>", "action": "publish", "label": "Publish", "isGranted": false }
    ]
  }
]
```
Unknown role id → `404 { error: "roleNotFound" }`. Module and action order is **not** guaranteed (no `ORDER BY`) — render them in a fixed order of your own so the grid doesn't reshuffle between loads.

**`PUT /admin/roles/:id/permissions`** — permission `roles:edit`. **Full replace**, not a diff:
```json
{ "permissionIds": ["<uuid>", "<uuid>"] }
```
- Send the ids of **every** checked box; anything omitted is revoked. `[]` clears all permissions.
- `permissionIds` must be an array of unique UUIDs (`ArrayUnique` + `IsUUID`); a malformed entry → `422` from the DTO.
- Any id that isn't a real permission → `422 { errors: { permissionIds: "notExists" } }`, and **nothing is changed**.
- Response `200`: the same grouped structure as the `GET`, already reflecting the new state — feed it straight back into the grid instead of re-fetching.

### 3. User role assignment — `/admin/users/:id/roles`

**`GET /admin/users/:id/roles`** — permission `users:view`. Response `200`: a plain array of `Role` objects (`[]` for a user with none). Unknown user → `404 { error: "userNotFound" }`.

**`PUT /admin/users/:id/roles`** — permission `users:edit`. **Full replace**, same semantics as §2:
```json
{ "roleIds": [3, 7] }
```
- `roleIds` are **numbers**, unique. `[]` removes every role from the user.
- Any unknown role id → `422 { errors: { roleIds: "notExists" } }`, nothing changed.
- Response `200`: the user's new role array.
- The server records who did the assignment (`user_roles.assigned_by` = the caller, `assigned_at` = now). Those fields aren't returned by this endpoint.

### 4. The permission model (what to gate the UI on)

Permissions are `(module, action)` pairs, seeded at startup from `src/authorization/authorization.constants.ts`. **Every module has all six actions**, so the grid is always 5 × 6 = 30 permissions:

| Module `name` | Label | Actions (all modules) |
|---|---|---|
| `master_data` | Master Data | `view`, `create`, `edit`, `delete`, `export`, `publish` |
| `courses` | Courses | ″ |
| `dashboard` | Dashboard | ″ |
| `users` | Users | ″ |
| `roles` | Roles | ″ |

Not every pair is actually enforced by a route today (nothing checks `dashboard:export` yet) — they're seeded so the grid is uniform and future routes can use them.

Which permission each Epic 2 route needs:

| Route | Required |
|---|---|
| `GET /admin/roles`, `GET /admin/roles/:id/permissions` | `roles:view` |
| `POST /admin/roles` | `roles:create` |
| `PATCH /admin/roles/:id`, `PUT /admin/roles/:id/permissions` | `roles:edit` |
| `DELETE /admin/roles/:id` | `roles:delete` |
| `GET /admin/users/:id/roles` | `users:view` |
| `PUT /admin/users/:id/roles` | `users:edit` |
| `GET /admin/master-data/**` | `master_data:view` |
| `POST /admin/master-data/**/codes` | `master_data:create` |
| `PATCH /admin/master-data/**/codes/:id`, `.../deactivate` | `master_data:edit` |

Seeded roles: `1` Admin, `2` User, `3` **Super Admin** — Super Admin is granted all 30 permissions by the seeder. Roles `1`/`2` are the boilerplate's own roles and carry **no** permissions.

⚠️ **There is no "what can I do?" endpoint.** The FE cannot ask the API for the current user's flattened permission set — `GET /auth/profile/me` (Epic 1) does not include roles or permissions. Until such an endpoint exists, the options are: call `GET /admin/users/{myId}/roles` + `GET /admin/roles/{roleId}/permissions` per role on admin-shell mount and cache the union, or render the admin nav optimistically and treat a `403 PERMISSION_DENIED` as "hide this". The first needs `users:view` + `roles:view`, which a limited admin may not have — so prefer the optimistic approach and handle `403` centrally in your API client.

### 5. Master data admin — `/admin/master-data`

**`GET /admin/master-data/groups`** — permission `master_data:view`. Response `200`: plain array of the **7 seeded groups**, which are read-only in V1 (no create/delete endpoint by design):

`course_group`, `course_level`, `course_category`, `lecture_type`, `course_status`, `education_stage`, `career_interest`

```json
[
  { "id": "<uuid>", "groupKey": "course_group", "name": "Course Group", "description": null, "isActive": true, "displayOrder": 1, "createdAt": "...", "updatedAt": "..." }
]
```
Not ordered by the server — sort by `displayOrder` for the left sidebar.

**`GET /admin/master-data/groups/:groupKey/codes`** — permission `master_data:view`. Note the path segment is the **`groupKey` string** (`course_level`), not the group's UUID. Response `200`, ordered by `displayOrder ASC`, and **includes inactive codes** (that's what the admin table wants):
```json
[
  {
    "id": "<uuid>", "code": "beginner", "name": "Beginner",
    "description": "For first-time learners", "thumbnailUrl": null,
    "isActive": true, "displayOrder": 1,
    "group": { "id": "<uuid>", "groupKey": "course_level", "name": "Course Level", "isActive": true, "displayOrder": 2 },
    "linkedCoursesCount": 12,
    "createdAt": "...", "updatedAt": "..."
  }
]
```
`linkedCoursesCount` is the sum of three counts for that code: courses using it as `level`, courses using it as `category`, and `course_group_assignments` rows. Unknown `groupKey` → `404 { error: "masterDataGroupNotFound" }`.

**`POST /admin/master-data/groups/:groupKey/codes`** — permission `master_data:create`.
```json
{ "code": "beginner", "name": "Beginner", "description": "…", "thumbnailUrl": "https://cdn…/x.png", "isActive": true, "displayOrder": 1 }
```
- `code` and `name` required; the rest optional (`isActive` defaults `true`, `displayOrder` defaults `0`).
- Uniqueness is on **`(group, name)`** — *not* on `code`. A duplicate name in the same group → `409 { errors: { name: "codeNameExistsInGroup" } }`. Two codes in the same group may share the same `code` string, so don't rely on `code` as a key.
- `thumbnailUrl` is a plain string — upload the image first via `POST /api/v1/files/upload` and store the returned `file.path` (see Epic 3 §0 of its API guide).
- Response `201`: the `MasterDataCode` (with nested `group`, without `linkedCoursesCount`).

**`PATCH /admin/master-data/groups/:groupKey/codes/:id`** — permission `master_data:edit`. Any subset of the create fields. Renaming into a name already used in that group → the same `409`; keeping its own name is fine. If `:id` exists but belongs to a **different** group than `:groupKey`, you get `404 { error: "masterDataCodeNotFound" }` — so the `groupKey` in the path is enforced, not decorative.

**`PATCH /admin/master-data/groups/:groupKey/codes/:id/deactivate`** — permission `master_data:edit`, no body. Sets `isActive: false` and nothing else. The row keeps appearing in the admin list (with `isActive: false`) and every existing course link is preserved; it just stops being offered for new assignments via the public endpoint in §6. Response `200`: the updated code.

There is **no delete endpoint for codes** — deactivate is the intended "remove". To re-activate, `PATCH .../codes/:id` with `{ "isActive": true }`.

### 6. Reading codes outside the admin panel — two endpoints, pick carefully

| | `GET /api/v1/master-data/codes` | `GET /api/v1/master-data-codes` |
|---|---|---|
| Auth | **None** (public) | JWT required (any logged-in user) |
| Filters | `groupKey` (optional) | `groupKey`, `page`, `limit` |
| Active filter | **Always `isActive: true`** | None — returns inactive codes too |
| Response | plain array, max 50, `displayOrder ASC` | `{ "data": [...], "hasNextPage": bool }` |
| Use for | public catalog filters, onboarding, course-editor dropdowns | Epic 1's onboarding guide references this one |

Note the near-identical paths — `master-data/codes` (slash) vs `master-data-codes` (hyphen). **Default to the public `/master-data/codes`** for anything the user picks from: it's the only one that hides deactivated codes, which is exactly the "deactivated code no longer selectable" acceptance criterion. Omitting `groupKey` returns active codes across *all* groups, which is rarely what you want — always pass it.

```
GET /api/v1/master-data/codes?groupKey=course_level
→ 200 [ { "id": "…", "code": "beginner", "name": "Beginner", "displayOrder": 1, "isActive": true, "group": { … } } ]
```

⚠️ The hyphenated `/master-data-codes` route also exposes generated `POST`/`PATCH`/`DELETE` handlers behind **JWT only, with no permission check**. Do not build against them — use the `/admin/master-data/**` endpoints in §5. (Still open: unlike the learning tables, this one is left alone because older epics document `GET /master-data-codes?groupKey=` as the onboarding dropdown source.)

✅ The public `GET /master-data/codes?groupKey=` and the admin `GET /admin/master-data/groups/:groupKey/codes` were both silently capped at 50 rows with no paging control — `course_level` had already passed 50, so options were vanishing from dropdowns and from the admin screen. A `groupKey`-scoped request now returns the whole group; treat the response as complete.

### 7. ✅ Closed: `/user-roles` and `/role-permissions` are gone

These generated CRUD controllers were guarded by `AuthGuard('jwt')` only, so any logged-in user could `POST /api/v1/user-roles` with `{ "user": { "id": <own id> }, "role": { "id": 3 } }` and grant themselves Super Admin. Both controllers have been **removed** — the routes now 404. Role and permission assignment lives only on `PUT /admin/users/:id/roles` (§3) and `PUT /admin/roles/:id/permissions` (§2), both behind `PermissionGuard`.

**Bootstrapping.** `PermissionGuard` reads the `user_role` table, not the legacy `user.roleId`, so a fresh database had nobody who could pass a permission check — which is why `/user-roles` was the only way in. A startup seed now grants Super Admin to `admin@example.com` (password `secret`) when no user holds it. Move the role to a real account and the seed stays out of the way.

The same fix landed on the generated CRUD for the learning tables (`/enrollments`, `/quiz-attempts`, `/lecture-progresses`, `/certificates`, `/course-ratings`, `/quiz-answer-options` and friends): they now require `courses:edit` and answer 403 to a student token.

### Suggested FE flow

1. **`/admin/roles`** → `GET /admin/roles` once on mount; the array already carries `assignedUsersCount`, so the table needs no second call. Sort client-side.
2. **Create/edit role modal** → `POST` / `PATCH /admin/roles/:id`. Map `409 errors.name === 'roleNameExists'` to an inline error on the name field.
3. **Delete role** → confirm dialog, then `DELETE`. On `409 code === 'ROLE_HAS_USERS'`, keep the dialog open and swap the copy to "N users still have this role" using the `assignedUsersCount` you already have.
4. **`/admin/roles/:id/permissions`** → `GET .../permissions` builds the entire grid (all modules × 6 actions, pre-checked). Track checked ids in local state; "Save" sends the **full** id list to `PUT .../permissions` and re-renders from the response. Nothing needs re-fetching.
5. **User role assignment** (from the users page) → `GET /admin/users/:id/roles` to seed the multi-select from `GET /admin/roles`, then `PUT` the full `roleIds` array.
6. **`/admin/master-data`** → `GET /admin/master-data/groups` for the sidebar (sort by `displayOrder`), then `GET .../groups/:groupKey/codes` per selection. Add/edit via `POST`/`PATCH`; the "active" toggle calls `.../deactivate` when switching off and `PATCH { isActive: true }` when switching on. Show `linkedCoursesCount` as a warning before deactivating.
7. **Everywhere else** (course editor dropdowns, catalog filters, onboarding) → the public `GET /master-data/codes?groupKey=…` from §6.
