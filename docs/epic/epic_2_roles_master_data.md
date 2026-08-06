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
