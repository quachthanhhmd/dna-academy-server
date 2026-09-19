# Epic 1 — Permission Model

> **Requirement + implementation plan**, in three parts:
>
> | Part | For | Contains |
> |---|---|---|
> | [§1 API integration](#1-api-integration) | FE, once BE ships | Every endpoint added, changed or removed — paths, bodies, responses, error codes |
> | [§2 BE work](#2-be-work) | BE | Ordered tasks, migrations, the security floor |
> | [§3 FE work](#3-fe-work) | FE | Screens and gating, written against §1 |
>
> Reviewed against the code on 17/09/2026. Touches Epic 1 (auth, social login), Epic 5 (instructor
> accounts), Epic 7 (dashboard scope) and every `/admin/courses/**` route. Where those files
> disagree with this one, this one wins.

---

## 0. Requirements and decisions

### 0.1 Product requirements

| # | Requirement |
|---|---|
| **R1** | Admin creates instructor **accounts** from the Instructors screen. |
| **R2** | On the Students screen, admin **cannot edit student data**. The only write is a role change (plus deactivate, D9). |
| **R3** | Instructors see dashboard **aggregates for their own courses**, never student-level detail. |
| **R4** | A **co-instructor is view-only** on a course. |
| **R5** | Social login works like Shopee: **if an account with that email exists, sign into it; otherwise create one.** Facebook and Google only. |

### 0.2 Locked decisions

| # | Decision |
|---|---|
| **D1** | **Admin and Super Admin are one role** — `1 · Admin`. Role 3 is merged in and deleted. |
| **D2** | **`user_role` is the only source of truth for roles.** `RolesGuard` is deleted; every admin route uses `PermissionGuard`. `user.role_id` survives only as a same-transaction mirror until its last reader is gone, then is dropped. |
| **D3** | **One role per user**, enforced by `UNIQUE (user_id)` on `user_role`. |
| **D4** | **Authorization checks permissions, never role names.** No `hasRole('admin')`. Custom roles from `/admin/roles` behave exactly like built-in ones. |
| **D5** | **Keep `courses:edit`** on its 30 routes. Add **`courses:edit_any`** as the ownership bypass. |
| **D6** | Dashboard permissions stay under **`dashboard`**, plus `dashboard:view_students`. |
| **D7** | A primary instructor **edits** their course but **cannot create, publish or delete** courses in V1. |
| **D8** | Co-instructors are **excluded from dashboard scope** — only courses where the caller is primary count. |
| **D9** | Admin **may deactivate** any user. Account state is not profile data. |
| **D10** | Instructor → User downgrade only when the instructor has **no** `course_instructor` rows. |
| **D11** | Social login links by email **with guards G1–G6** (§2.8). **G3 is confirmed:** accounts holding admin-panel permissions never auto-link. |
| **D12** | **Apple sign-in is removed.** The client never used it, and a third provider on the old code path would bypass every guard in D11. |

### 0.3 Roles after this epic

| id | Role | Permissions |
|---|---|---|
| 1 | **Admin** | all 40 |
| 2 | **User** | none |
| 4 | **Instructor** | `dashboard:view`, `courses:view`, `courses:edit` |
| — | *custom* | whatever `/admin/roles` grants |

`co_instructor` is **not** a role. It is a per-course relation in `course_instructor.role`.

---

## 1. API integration

> The contract FE builds against. **Implemented on branch `feat/permission-model` (18/09/2026)** —
> this section now describes what the server does. Where the build differs from the original
> plan, the difference is marked **[as built]** with its reason; §1.11 lists every error code.

### 1.1 Conventions

Base path `/api/v1`. All authenticated routes take `Authorization: Bearer <token>`.

**Error shapes** — four, each used for one kind of failure:

| Status | Body | Meaning | Client should |
|---|---|---|---|
| `403` | `{ "code": "PERMISSION_DENIED", "required": { "module": "users", "action": "edit" } }` | Caller's role lacks the permission | Should never happen — the control should not have rendered (§1.2) |
| `403` | `{ "status": 403, "code": "STUDENT_PROFILE_IMMUTABLE" }` | A business rule, not a missing permission | Show the rule's message |
| `404` | standard | Resource missing **or** a course the caller does not teach | Treat as not found |
| `409` | `{ "status": 409, "error": "instructor_has_courses", …extra }` | Valid request, current state forbids it | Show the message; `extra` carries detail |
| `422` | `{ "status": 422, "errors": { "email": "emailAlreadyExists" } }` | Field validation | Map `errors` onto form fields |
| `403` | `{ "status": 403, "code": "ROLE_EXCEEDS_CALLER" }` | **[as built]** The target (a user or a role) holds a permission the caller lacks | Hide the control for such targets; show "You cannot change an account with more access than yours" |

`409` codes are `snake_case` and `403` business codes are `SCREAMING_SNAKE`, matching the existing
`instructors-admin` and `learning` modules.

**Permission strings** are `module:action`, e.g. `courses:edit_any`.

### 1.2 `GET /auth/me/permissions` — **new**

Everything the client gates on comes from here. Fetch after login, after token refresh, and after
any role change.

```jsonc
// 200
{
  "role": { "id": 4, "name": "Instructor" },
  "permissions": ["courses:edit", "courses:view", "dashboard:view"]
}
```

- `permissions` is sorted and deduplicated. An empty array means no admin-panel access.
- **Do not gate on `role.id`.** Custom roles exist; a role named "Content Editor" may hold
  `courses:edit_any`. `role` is for display only.

**Changes to existing auth responses:**

- The JWT **no longer carries `role`**. Its payload is `{ id, sessionId }`.
- `GET /auth/me` still returns `user.role` during the transition, but it is **deprecated** — it
  mirrors `user_role` and will be removed. Read §1.2 instead.

### 1.3 Social login

#### `POST /auth/facebook/login` — changed behaviour, same shape

```jsonc
// request
{ "accessToken": "<facebook access token>" }

// 200 — unchanged LoginResponseDto
{ "token": "…", "refreshToken": "…", "tokenExpires": 1758100000000,
  "user": { … }, "requiresOnboarding": false }
```

#### `POST /auth/google/login` — changed behaviour, same shape

```jsonc
{ "idToken": "<google id token>" }
```

#### What the server now does, for both

| Situation | Result |
|---|---|
| This Facebook/Google identity was linked before | 200 — signed into that account |
| Not linked; provider returned an email that matches an **ordinary** account | 200 — signed into it; the link is saved |
| Not linked; email matches an account with **admin-panel permissions** | **409** `social_link_requires_password` |
| No match, or provider returned no email | 200 — new account, role User, `requiresOnboarding: true` |
| The account (linked or matched) is deactivated | **403** `{ "status": 403, "code": "ACCOUNT_DEACTIVATED" }` |

**[as built]** An account created from a provider that gave no email has `emailVerified: false`
and `email: null`. `POST /auth/email/login` and `POST /auth/refresh` also refuse a deactivated
account: login with **403 `ACCOUNT_DEACTIVATED`** (only after the password is checked, so the state
is not disclosed to a guess), refresh with 401.

```jsonc
// 409 — G3
{ "status": 409, "error": "social_link_requires_password" }
```

The body intentionally omits the email and role. The client shows: *"This account must sign in
with its password once. After that, link Facebook from your profile."* and a button to the password
sign-in form.

**Facebook may return no email** (accounts registered by phone, or email permission declined). The
server then always creates a new account, even if the person already has one. They can merge by
linking from their profile (§1.4).

#### `POST /auth/apple/login` — **removed**

Returns 404. The client does not call it.

### 1.4 Linked social accounts — **new**

Needed so G3 has a way out, and so users without a provider email can attach one.

#### `GET /auth/me/social-links`

```jsonc
// 200
{ "links": [ { "provider": "facebook", "linkedAt": "2026-09-17T10:00:00Z" } ],
  "hasPassword": true }
```

#### `POST /auth/me/social-links/facebook` · `POST /auth/me/social-links/google`

```jsonc
{ "accessToken": "…", "password": "…" }   // facebook
{ "idToken": "…", "password": "…" }       // google
// 201
{ "provider": "facebook", "linkedAt": "2026-09-17T10:00:00Z" }
```

| Error | When |
|---|---|
| `409 social_identity_in_use` | That Facebook/Google identity is already linked to another account |
| `409 provider_already_linked` | This account already has a link for that provider |
| `422 { "errors": { "password": "required" } }` | **[as built]** The account has a password (`hasPassword: true`) and none was sent |
| `422 { "errors": { "password": "incorrectPassword" } }` | **[as built]** Wrong password |
| `422 { "errors": { "token": "wrongToken" } }` | The provider returned no identity |

**[as built] Why a password.** A link outlives the session that made it and every later password
change. Without the password, a stolen 15-minute access token would be enough to attach the thief's
own Facebook to the account for good. Ask for the password in the link dialog when `hasPassword`;
accounts without one (social-only) send none. The password is checked before the provider is called.

#### `DELETE /auth/me/social-links/:provider`

`204`. **`409 last_login_method`** when unlinking would leave the account with no password and no
other link — it could never sign in again. `404` when there is no link for that provider, or the
provider is not `facebook` / `google`.

### 1.5 Password set and invite

The invite for a new instructor account (§1.7) uses the **existing** reset flow. The email links to
the existing client page `/password-change?hash=…&expires=…&invite=1`. **[as built]** `invite=1`
is there so the page can say "Set your password" instead of "Reset" (FE-9). The invite lives
**72 hours** (O1); a reset link keeps `AUTH_FORGOT_TOKEN_EXPIRES_IN`.

#### `POST /auth/reset/password` — now single-use

```jsonc
{ "hash": "…", "password": "…" }   // 204
```

A hash is rejected once the password has changed — through this link, another link, or any other
way: `422 { "errors": { "hash": "invalidHash" } }` — the same code the page already handles for an
expired link. Setting a password also marks the email verified and activates an account whose email
was not yet confirmed; a deactivated account stays deactivated.

**[as built]** Single-use is enforced by binding the link to the password it was issued for
(an HMAC of the stored hash), not by a `password_changed_at` column — same guarantee, no migration.

`POST /auth/forgot/password` is unchanged.

### 1.6 Users — Students screen

`/users` keeps its paths; its guard changes from role-based to permission-based.

| Method | Path | Permission | Change |
|---|---|---|---|
| `GET` | `/users` | `users:view` | Guard only. `filters.roles` now filters on `user_role`. |
| `GET` | `/users/:id` | `users:view` | Guard only. |
| `POST` | `/users` | `users:create` | **`role` removed from body.** New users are User; change it with §1.6.2. |
| `PATCH` | `/users/:id` | `users:edit` | **`role`, `email`, `password`, `status` removed from body.** **403 `STUDENT_PROFILE_IMMUTABLE`** when the target's role is User. |
| `PATCH` | `/users/:id/status` | `users:edit` | **New.** Allowed on any target (D9). |
| `DELETE` | `/users/:id` | `users:delete` | **[as built]** 409 `cannot_delete_self`; ends the account's sessions. |

**[as built]**

- `PATCH /users/:id` accepts only `firstName`, `lastName`, `fullName`, `photo`,
  `profilePictureUrl`, `age`, `dateOfBirth`, `locale`. `emailVerified` and `onboardingDone` are
  ignored too — the first gates social-login linking (G1).
- `PATCH /users/:id`, `PATCH /users/:id/status` and `DELETE /users/:id` answer **403
  `ROLE_EXCEEDS_CALLER`** when the target holds a permission the caller lacks. A custom role with
  `users:edit` must not be able to deactivate an Admin.
- `sort` accepts `orderBy` in `id`, `email`, `firstName`, `lastName`, `fullName`, `createdAt`,
  `updatedAt` and `order` in `ASC` / `DESC`; anything else is 422 (it could order by `password`).

Fields removed from a body are **ignored**, not rejected (the global validation pipe strips them).
Sending `role` to `PATCH /users/:id` returns 200 and changes nothing — remove it from the form rather
than relying on an error.

#### 1.6.1 `PATCH /users/:id/status` — new

```jsonc
{ "statusId": 3 }   // 1 active, 3 deactivated
// 200 → the updated user
```

`409 cannot_change_own_status` when an admin tries to deactivate themselves.

**[as built] A new status, 3 `Deactivated`.** Status 2 `Inactive` already means "email not
confirmed yet": such accounts can sign in, and confirming the email turns them active. Deactivating
through it would have blocked nothing and been undone by a confirmation email. So:

| `statusId` | Meaning | Sign-in | Settable here |
|---|---|---|---|
| 1 | Active | yes | yes |
| 2 | Inactive — email not confirmed | yes | **no** (422) |
| 3 | Deactivated | **no** — 403 `ACCOUNT_DEACTIVATED` | yes |

Deactivating ends every session at once (refresh fails); an access token already issued lapses
within `AUTH_JWT_TOKEN_EXPIRES_IN` (15 min). Show status 3 as "Deactivated" and 2 as "Unverified".

#### 1.6.2 `PUT /admin/users/:id/roles` — **changed body**

The only way to change a role.

```jsonc
// request — was { "roleIds": [1, 4] }
{ "roleId": 4 }

// 200
{
  "userId": 42,
  "role": { "id": 4, "name": "Instructor" },
  "instructorId": "uuid",          // present when the change created or kept a profile
  "profileCreated": true
}
```

Permission: **`users:assign_role`** (was `users:edit`).

| Transition | Result |
|---|---|
| User → Instructor | 200; a draft instructor profile is created and linked if none exists (`profileCreated: true`) |
| User → Admin | 200 |
| Instructor → User | **409 `instructor_has_courses`** `{ "assignedCoursesCount": 3 }` if the profile teaches anything; otherwise 200 and the profile is deactivated |
| Admin → anything | **409 `cannot_demote_last_admin`** if no other active Admin exists |
| Caller changes their own role | **409 `cannot_change_own_role`** |
| Same role | 200, no change |
| Unknown `roleId` | `422 { "errors": { "roleId": "notExists" } }` |
| **[as built]** The role, or the user's current role, holds a permission the caller lacks | **403 `ROLE_EXCEEDS_CALLER`** — otherwise `users:assign_role` on a custom role could mint Admins |

**[as built]** The draft profile created on User → Instructor is **inactive** (`isActive: false`):
it stays off the public catalogue, cannot be put on a course, and grants no course access until an
admin fills it in and activates it (`PATCH /admin/instructors/:id/status`). Instructor → User
applies to any move off Instructor except to Admin; an Admin who teaches keeps the profile.

`GET /admin/users/:id/roles` is unchanged in shape and always returns one element.

### 1.7 Instructors

#### `POST /admin/instructors` — **new optional fields**

```jsonc
{
  "fullName": "Nguyễn Văn A",
  "headline": "Senior Data Analyst @ VNG",
  "expertiseCodeIds": ["uuid"],
  // …existing fields unchanged…

  "createAccount": true,             // new
  "accountEmail": "a.nguyen@dna.vn", // new — required when createAccount
  "sendInvite": true                 // new — default true
}
```

`accountEmail` is the **login** email. It is deliberately not `emailPublic`, which remains the
public contact address shown on the profile.

| Condition | Result |
|---|---|
| `createAccount` without `accountEmail` | `422 { "errors": { "accountEmail": "required" } }` |
| `createAccount` together with `userId` | `422 { "errors": { "userId": "conflictsWithCreateAccount" } }` |
| `accountEmail` already registered | `422 { "errors": { "accountEmail": "emailAlreadyExists" } }` — to give an existing account a profile, use §1.6.2 |
| `createAccount: true` | also requires **`instructors:create_account`**, else 403 `PERMISSION_DENIED` |

Response adds three fields to the existing instructor payload:

```jsonc
{ "id": "uuid", …, "userId": 57, "hasAccount": true, "inviteSent": true }
```

The invite email is sent **after** the record is committed. `inviteSent: false` with
`hasAccount: true` means the email failed (or `sendInvite: false`); resend it.

**[as built]** The response is the full detail payload (`GET /admin/instructors/:id`) plus
`inviteSent`. The account is created with `onboardingDone: true` — the learner questionnaire does
not apply to it.

#### `POST /admin/instructors/:id/invite` — new

Permission `instructors:create_account`. `204`.

| Error | When |
|---|---|
| `409 no_linked_account` | The profile has no login account |
| `409 already_activated` | The account already has a password |
| `503 invite_not_sent` | **[as built]** The mail server refused it; try again |

#### `GET /admin/instructors` and `GET /admin/instructors/:id` — **new fields**

```jsonc
{ …, "hasAccount": true, "accountActivated": false }
```

`accountActivated` is `true` once a password has been set. Drives the account badge and whether
"Resend invite" is shown.

### 1.8 Courses — admin

#### `GET /admin/courses` — **scoped, new fields**

- Callers with `courses:edit_any` see every course.
- Everyone else sees only courses where they are **primary or co-instructor**.

Each item gains:

```jsonc
{ …, "myRole": "primary", "canEdit": true }
// myRole: "admin" | "primary" | "co_instructor"
// "admin" means the caller holds courses:edit_any
```

#### `GET /admin/courses/:id` — same two fields

A course the caller does not teach returns **404**, not 403, so its existence is not disclosed.

#### Every course write — **new errors**

Applies to course metadata, sections, lectures, lecture moves, lecture content and course-scoped
career-reflection questions.

| Caller | Result |
|---|---|
| holds `courses:edit_any` | allowed |
| primary instructor | allowed |
| co-instructor | **403 `CO_INSTRUCTOR_READ_ONLY`** |
| does not teach the course | **404** |

Create, publish, unpublish and delete remain `courses:create` / `courses:publish` /
`courses:delete` — instructors hold none of them and receive `403 PERMISSION_DENIED`.

**Use `canEdit` to render the editor read-only.** The 403 is the server's guarantee, not the UI's
signal.

**[as built] Also scoped the same way:**

| Route | Rule |
|---|---|
| `GET /admin/courses/:courseId/sections` | view access (404 for a course the caller does not teach) |
| `DELETE` sections and lectures | `courses:delete` **and** edit access |
| `PATCH /admin/lectures/:id/content` | edit access on the lecture's course |
| `DELETE /admin/enrollments/:id/progress`, `POST /enrollments/:id/certificate/regenerate` | edit access on the enrollment's course — otherwise every instructor could reset any learner |
| `/admin/career-reflection-questions` | `PATCH` / `deactivate` / `DELETE` need edit access on the question's course; a **global** question needs `courses:edit_any` (403 `PERMISSION_DENIED`). Moving a question (`course` in the body) needs edit access on the target too. `GET` lists global questions plus the caller's courses; `?courseId=` of another course is 404. |

**[as built] Admin-only course fields.** Without `courses:edit_any`:

- `PATCH /admin/courses/:id` with `primaryInstructorId` or `coInstructorIds` →
  **403 `INSTRUCTOR_ASSIGNMENT_REQUIRES_ADMIN`**. Who teaches a course is an admin decision; a
  primary could otherwise hand the course away or add co-instructors. Leave these fields out of the
  instructor's form.
- `PUT /admin/courses/:id/groups` → **403 `PERMISSION_DENIED`** (`courses:edit_any`). Catalogue
  placement ("featured", "popular") is curated. Hide the groups editor unless `courses:edit_any`.

`myRole` is `"co_instructor"` for a guest too.

### 1.9 Dashboard

Amends [`epic-7/epic_7_api.md`](./epic-7/epic_7_api.md).

| Endpoint | Permission | Change |
|---|---|---|
| `/admin/dashboard/kpis`, `/enrollments-over-time`, `/progress-distribution`, `/top-courses`, `/enrollment-status`, `/reflection` | `dashboard:view` | **scoped** |
| `/admin/dashboard/students`, `/reflection/comments` | **`dashboard:view_students`** (was `dashboard:view`) | |
| `/admin/dashboard/export` | `dashboard:export` | **[as built]** `dataset=students` and `dataset=reflection-comments` also need `dashboard:view_students` (403 `PERMISSION_DENIED`) — they are the same rows. Scoped like everything else. |

Every response's `meta` gains:

```jsonc
"scope": "all"   // or "own"
```

`"own"` means the numbers cover only courses where the caller is the primary instructor. With no
such course, the response is the ordinary empty shape — **never platform totals**.

**[as built]** Under `"own"`, *Registered students* counts learners who have ever enrolled in the
caller's courses, as it already did under a course filter. `courseId` of a course outside the scope
is **404**. `/reflection` lists global questions plus those of the caller's courses.

### 1.10 Removed routes

All return 404. **The client calls none of them** — verified against `dna-academy-client` on
17/09/2026.

| Route | Why |
|---|---|
| `/auth/apple/login` | D12 |
| `/oauth-accounts` | Account takeover (§2.1) |
| `/lectures` `/sections` `/lecture-content-articles` `/lecture-content-documents` `/lecture-content-quizzes` `/lecture-content-reflections` `/lecture-content-videos` `/course-learning-outcomes` `/course-requirements` `/course-target-learners` `/course-group-assignments` | Open to every logged-in user; replaced by `/admin/courses/**` |
| `/student-profiles` `/student-career-interests` | Any user could edit any profile |
| `/permissions` `/modules` `/media-files` `/master-data-groups` | Open writes |
| `POST` `PATCH` `DELETE` on `/master-data-codes` | Open writes. **`GET /master-data-codes?groupKey=` stays** — onboarding uses it. |
| `/course-ratings` `/reflection-responses` `/quiz-attempts` `/quiz-attempt-answers` `/quiz-saves` `/enrollments` `/certificates` `/career-reflection-answers` `/lecture-progresses` `/quiz-questions` `/quiz-answer-options` `/reflection-questions` | Student data behind `courses:edit` (§2.1) |
| `/career-reflection-questions` (the generated CRUD) | **[as built]** The global question bank behind `courses:edit`. `/admin/career-reflection-questions` is the authoring surface; `GET /career-reflection-questions/grouped` (learning) stays. |

**Not removed:** the learning routes that share these prefixes — `/lectures/:id/progress`,
`/enrollments/:id/start`, `/enrollments/:id/certificate`, the quiz attempt flow and so on. They live
in the learning controllers and are unaffected.

### 1.11 Roles screen — **[as built]**

With custom roles first-class (D4), editing a role must not be a way up:

| Call | New rule |
|---|---|
| `PUT /admin/roles/:id/permissions` | **403 `ROLE_EXCEEDS_CALLER`** unless the caller holds every permission the role has now and every permission it will have. **409 `built_in_role`** for Admin (id 1): it holds every permission by definition. |
| `DELETE /admin/roles/:id` | **409 `built_in_role`** for Admin, User and Instructor (ids 1, 2, 4). |

### 1.12 Every new error code

| Status | Code | Where |
|---|---|---|
| 403 | `ACCOUNT_DEACTIVATED` (`code`) | email / Facebook / Google login |
| 403 | `CO_INSTRUCTOR_READ_ONLY` (`code`) | every course write (§1.8) |
| 403 | `INSTRUCTOR_ASSIGNMENT_REQUIRES_ADMIN` (`code`) | `PATCH /admin/courses/:id` |
| 403 | `ROLE_EXCEEDS_CALLER` (`code`) | `PUT /admin/users/:id/roles`, `PATCH /users/:id`, `PATCH /users/:id/status`, `DELETE /users/:id`, `PUT /admin/roles/:id/permissions` |
| 403 | `STUDENT_PROFILE_IMMUTABLE` (`code`) | `PATCH /users/:id` |
| 409 | `already_activated`, `no_linked_account` | `POST /admin/instructors/:id/invite` |
| 409 | `built_in_role` | roles screen |
| 409 | `cannot_change_own_role`, `cannot_demote_last_admin`, `instructor_has_courses` | `PUT /admin/users/:id/roles` |
| 409 | `cannot_change_own_status` | `PATCH /users/:id/status` |
| 409 | `cannot_delete_self` | `DELETE /users/:id` |
| 409 | `last_login_method`, `provider_already_linked`, `social_identity_in_use` | social links |
| 409 | `social_link_requires_password` | Facebook / Google login |
| 422 | `accountEmail: required \| emailAlreadyExists`, `userId: conflictsWithCreateAccount` | `POST /admin/instructors` |
| 422 | `password: required \| incorrectPassword` | `POST /auth/me/social-links/*` |
| 422 | `roleId: notExists` | `PUT /admin/users/:id/roles` |
| 503 | `invite_not_sent` | `POST /admin/instructors/:id/invite` |
| 429 | `RATE_LIMITED` (`code`, with `retryAfterSecs`) | §1.13 |

### 1.13 Rate limits — **[as built]**

`429 { "status": 429, "code": "RATE_LIMITED", "retryAfterSecs": 540 }`, with a `Retry-After`
header on the route-level limits. Show "Too many attempts — try again in N minutes"; do not retry
automatically.

| Route | Limit | Counted by | Why this number |
|---|---|---|---|
| `POST /auth/email/login` | **10 failed** / 15 min | email — failures only; a success resets it | Password guessing against one account, from any number of IPs. A person mistypes 2–3 times; 10 leaves room without giving a guesser more than ~1000 tries a day. |
| `POST /auth/email/login` | 100 / 15 min | IP | Many accounts sprayed from one source. High, because a whole class signs in from one school NAT. |
| `POST /auth/forgot/password` | 3 / hour · 20 / hour | email · IP | Each call emails someone: stops an inbox being flooded. 3 covers "the email didn't arrive" twice. |
| `POST /auth/email/confirm/resend` | 3 / hour · 20 / hour | email · IP | Same reason. |
| `POST /auth/reset/password` | 20 / 15 min | IP | The hash cannot be guessed; this only caps waste. |
| `POST /auth/email/register` | 60 / hour | IP | Sends an email per account; 60 lets a class register together. |
| `POST /auth/facebook/login`, `/auth/google/login` | 60 / 15 min | IP | Each call reaches the provider's API. |
| `POST /auth/me/social-links/*` | 10 / 15 min | user | It checks the account password; a stolen token must not become a password oracle. |
| `PATCH /auth/me` | 20 / 15 min | user | Changing the password checks the old one; ordinary profile saves stay well under it. |
| `POST /admin/instructors/:id/invite` | 3 / hour · 20 / hour | instructor · admin | Each call emails the instructor. |

Operations: counters live in each API process's memory (a restart clears them; N replicas give
N× the budget). Behind a load balancer set `APP_TRUST_PROXY` to the hop count, or every client
shares one IP budget. `RATE_LIMIT_IP_MULTIPLIER` widens only the per-IP limits.

---

## 2. BE work

### 2.1 The security floor — first, before anything else

Nothing in §2.5–§2.9 means anything while these routes stand.

**S1 — Account takeover through `POST /oauth-accounts` (critical).**
`OauthAccountsController` is generated CRUD guarded only by `AuthGuard('jwt')`; its create DTO
accepts an arbitrary `user: { id }`; `validateFacebookLogin` trusts any matching
`(provider, provider_uid)` row and returns that user's tokens. `oauth_account` has no unique
constraint on `(provider, provider_uid)`, so one identity can point at several users. Any logged-in
user can therefore sign in as any other, including every admin.

**Open generated CRUD.** Nineteen generated controllers write with only `AuthGuard('jwt')` — any
student can create, edit and delete course content, other students' profiles, and authorization
metadata (§1.10).

**Student data behind `courses:edit`.** Twelve generated controllers carry a class-level
`@RequirePermission('courses', 'edit')`, which covers their `GET`s too. D5 grants `courses:edit` to
instructors. With these still mounted, every instructor reads and writes every student's ratings,
answers, reflections, enrollments and certificates — R3 broken without touching the dashboard.

**If any environment has been internet-reachable**, audit `oauth_account` before §2.2: every row
should be that user's own first social login.

### 2.2 Tasks, in order

> **Status 18/09/2026:** BE-1 … BE-15 done on `feat/permission-model` (BE-1, BE-3 and the
> `oauth_account` unique index shipped earlier in `fix/auth-security`). **BE-16 done** 18/09 — the 60
> unreferenced `UR Custom Role <timestamp>` rows were deleted from the dev database. Migrations added:
> `1787700000000` constraints, `…001` Super Admin merge, `…002` one role per user, `…003`
> permission catalogue and grants (a migration, not a boot seed, so production gets it and a
> revoked Instructor grant stays revoked), `…004` Google `social_id` → `oauth_account`,
> `…005` status 3 Deactivated.

| # | Task | Depends on | Size |
|---|---|---|---|
| **BE-1** | Remove `OauthAccountsController` from its module; keep the service | — | 0.5h |
| **BE-2** | Remove every controller in §1.10 from its module; keep services. `master-data-codes`: keep `GET`, remove writes | — | 0.5d |
| **BE-3** | Remove `AuthAppleModule`, `appleConfig`, `APPLE_APP_AUDIENCE` from `app.module.ts` and both env examples | — | 1h |
| **BE-4** | Migration §2.3 — constraints | BE-1 | 0.5d |
| **BE-5** | Migration §2.4 — merge Super Admin; remove `RoleEnum.superAdmin`; update seeds | BE-4 | 0.5d |
| **BE-6** | Migration §2.5 — normalise roles; `UserRolesService.setRole` as the **only** writer of `user_role` and `user.role_id` | BE-5 | 1d |
| **BE-7** | Delete `RolesGuard`; `UsersController` on `PermissionGuard`; body changes and `PATCH /users/:id/status` (§1.6) | BE-6 | 1d |
| **BE-8** | Move every `user.role_id` reader to `user_role` (§2.5); drop `role` from the JWT; `GET /auth/me/permissions` | BE-6 | 0.5d |
| **BE-9** | Seed §2.6 | **BE-2 — never before** | 0.5d |
| **BE-10** | `CourseAccessService` (§2.7); apply to every course write; `myRole` / `canEdit`; list scoping | BE-9 | 1.5d |
| **BE-11** | `PUT /admin/users/:id/roles` (§1.6.2) | BE-6 | 1.5d |
| **BE-12** | Dashboard scope, `view_students`, `meta.scope` (§1.9) | BE-9 | 1d |
| **BE-13** | Instructor accounts + single-use invite (§1.5, §1.7) | BE-6 | 1.5d |
| **BE-14** | Unified social login + G1–G6 + social links endpoints (§2.8, §1.3, §1.4) | BE-4 | 2d |
| **BE-15** | Tests for §4 | all | 2d |
| **BE-16** | Delete the ~60 `UR Custom Role <timestamp>` rows from the dev database | — | 1h |

**~14.5 days.** The ordering rule that matters most: **BE-9 after BE-2.** Seeding `courses:edit`
for instructors while the student-data controllers are mounted opens every student's data.

**Before BE-2, verify each removed path** against the client once more. The client's `/v1/lectures/…`,
`/v1/quiz-attempts/…` and `/v1/enrollments/…` calls resolve to the learning controllers, not to the
generated ones — confirm by path, not by prefix.

### 2.3 Migration `AddAuthorizationConstraints` (BE-4)

```sql
-- Refuse, don't guess: a duplicate social link may be the S1 exploit.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM "oauth_account"
             GROUP BY "provider", "provider_uid" HAVING COUNT(*) > 1) THEN
    RAISE EXCEPTION 'Duplicate oauth_account (provider, provider_uid) — audit before migrating';
  END IF;
END $$;

DELETE FROM "role_permission" a USING "role_permission" b
 WHERE a."role_id" = b."role_id" AND a."permission_id" = b."permission_id" AND a."id" > b."id";

ALTER TABLE "module"          ADD CONSTRAINT "UQ_module_name"              UNIQUE ("name");
ALTER TABLE "permission"      ADD CONSTRAINT "UQ_permission_module_action" UNIQUE ("module_id", "action");
ALTER TABLE "role_permission" ADD CONSTRAINT "UQ_role_permission"          UNIQUE ("role_id", "permission_id");
ALTER TABLE "oauth_account"   ADD CONSTRAINT "UQ_oauth_account_identity"   UNIQUE ("provider", "provider_uid");
CREATE INDEX "IDX_oauth_account_user" ON "oauth_account" ("user_id");

ALTER TABLE "user" ADD COLUMN "password_changed_at" timestamptz;
```

`permission.action` is a `varchar` — there is no Postgres enum to alter. Without these constraints no
seed is idempotent.

### 2.4 Migration `MergeSuperAdminIntoAdmin` (BE-5)

```sql
INSERT INTO "role_permission" ("role_id", "permission_id")
SELECT 1, "permission_id" FROM "role_permission" WHERE "role_id" = 3
ON CONFLICT ("role_id", "permission_id") DO NOTHING;

UPDATE "user_role" SET "role_id" = 1 WHERE "role_id" = 3;
UPDATE "user"      SET "role_id" = 1 WHERE "role_id" = 3;
DELETE FROM "role_permission" WHERE "role_id" = 3;
DELETE FROM "role" WHERE "id" = 3;
```

Id **1** survives, not 3: the client and the user seed already key on 1, so this is the smaller change.

Code: remove `RoleEnum.superAdmin`; `RolePermissionSeedService` grants to Admin;
`SuperAdminSeedService` becomes a bootstrap seed ensuring at least one user holds Admin.

### 2.5 Roles — one source of truth (BE-6, BE-8)

**Today** the two systems already disagree: `admin@example.com` is `user.role_id = 1` but
`user_role = 3`, and ordinary learners such as `john.doe@example.com` have **no `user_role` row at
all** — under `PermissionGuard` alone they would have no role.

**Migration `NormaliseUserRoles`:**

```sql
INSERT INTO "user_role" ("user_id", "role_id", "assigned_at")
SELECT u."id", u."role_id", now()
  FROM "user" u
 WHERE u."role_id" IS NOT NULL
   AND NOT EXISTS (SELECT 1 FROM "user_role" ur WHERE ur."user_id" = u."id");

-- Collapse multi-role users: Admin > Instructor > User > custom. None exist today; kept so the
-- migration is correct on any database.
DELETE FROM "user_role" ur
 USING (SELECT "id", ROW_NUMBER() OVER (
          PARTITION BY "user_id"
          ORDER BY CASE "role_id" WHEN 1 THEN 0 WHEN 4 THEN 1 WHEN 2 THEN 2 ELSE 3 END, "assigned_at"
        ) AS rn FROM "user_role") ranked
 WHERE ur."id" = ranked."id" AND ranked.rn > 1;

CREATE UNIQUE INDEX "UX_user_role_user" ON "user_role" ("user_id");

UPDATE "user" u SET "role_id" = ur."role_id" FROM "user_role" ur WHERE ur."user_id" = u."id";
```

**One writer.** `UserRolesService.setRole(userId, roleId, actorId)` writes `user_role` and
`user.role_id` in one transaction. Registration, social login, the role endpoint, instructor account
creation and seeds all call it. Nothing else writes either column.

**Every reader moves off `user.role_id`:**

| Reader | Becomes |
|---|---|
| `RolesGuard`, `@Roles(RoleEnum.admin)` on `UsersController` | deleted; `PermissionGuard` |
| `admin-dashboard/services/kpis.service.ts` (3 queries) | join `user_role` |
| `admin-dashboard/services/students.service.ts` | join `user_role` |
| JWT payload `role` in `auth.service.ts` (login and refresh) | removed |
| Client role gating | `GET /auth/me/permissions` (§3) |

When `grep -rn "role_id\|\.role\.id\|RoleEnum\.admin" src` returns only `setRole` and migrations, a
follow-up migration drops `user.role_id`.

Removing the role from the JWT also closes a staleness window: `RolesGuard` trusted a token living
`AUTH_JWT_TOKEN_EXPIRES_IN=15m`, so a demoted admin kept `/users` for fifteen minutes.
`PermissionGuard` reads the database on each request.

### 2.6 Permission seed (BE-9)

Today: 6 modules × 6 actions = 36. Add four:

| Permission | Guards |
|---|---|
| `courses:edit_any` | the bypass in `CourseAccessService`; dashboard scope |
| `dashboard:view_students` | `/students`, `/reflection/comments` |
| `instructors:create_account` | `createAccount` on create; invite endpoint |
| `users:assign_role` | `PUT /admin/users/:id/roles` |

Grants per §0.3. Idempotent via `ON CONFLICT ("module_id", "action")` and
`ON CONFLICT ("role_id", "permission_id")`.

### 2.7 `CourseAccessService` (BE-10)

```
assertCanEdit(userId, courseId):
  if hasPermission(userId, 'courses', 'edit_any')            → allow      -- D4
  row = course_instructor ci JOIN instructor i ON i.id = ci.instructor_id
        WHERE ci.course_id = courseId AND i.user_id = userId AND i.is_active
  if no row                                                  → 404
  if row.role = 'primary'                                    → allow
  else                                                       → 403 CO_INSTRUCTOR_READ_ONLY
```

One implementation, applied to every write in `courses-admin.controller.ts`,
`sections-admin.controller.ts`, `lectures-admin.controller.ts`, `lecture-move-admin.controller.ts`,
`lecture-content-admin.controller.ts` and the course-scoped writes in
`career-reflection-questions-admin.controller.ts`. No controller re-implements it.

`course_instructor` already supports this: `CHECK role IN ('primary','co_instructor','guest')` and a
partial unique index allowing one primary per course.

**Dashboard scope uses the same permission:**
`scope = hasPermission(userId, 'courses', 'edit_any') ? all : coursesWhereUserIsPrimary(userId)`.
"Sees everything" and "edits everything" cannot drift apart.

### 2.8 Social login (BE-14)

**Today, two implementations:** Facebook uses `oauth_account` and persists the link; Google uses
`user.social_id`, does not persist a link on email match, and **overwrites the user's email** with
the provider's. Apple uses the Google path and is removed (D12).

**One algorithm for Facebook and Google:**

```
1. oauth_account WHERE provider = :p AND provider_uid = :uid
     found → sign in as that user

2. provider returned an email it vouches for (G2)
     user WHERE lower(email) = lower(:email)
     found:
       holds any admin-panel permission → 409 social_link_requires_password   (G3)
       email_verified = false          → G1
       insert oauth_account, sign in

3. otherwise
     create user (email_verified = true when an email is present)
     setRole(User); insert oauth_account; sign in
```

Migration backfills `oauth_account` from every `user` with a non-null `social_id`; after that
`social_id` is no longer read.

**Guards:**

| # | Rule | Closes |
|---|---|---|
| **G1** | Linking to an account whose `email_verified = false`: **clear its password, revoke its sessions, set `email_verified = true`.** | **Pre-account hijacking.** An attacker registers the victim's email with a password and never verifies it. The victim later signs in with Facebook and is linked to that account — while the attacker still knows the password. |
| **G2** | Match only on an email the provider vouches for. Google: `email_verified === true` in the verified ID-token payload. Facebook: the Graph API returns only the confirmed primary email. No email → never match. | Linking on an unconfirmed address |
| **G3** | An account holding **any** admin-panel permission is never auto-linked → `409 social_link_requires_password`. Linking happens from the profile, after a password sign-in (§1.4). | A compromised or look-alike social account carrying an admin's email becomes an admin session |
| **G4** | Never overwrite an existing user's email from the provider. | Today's Google path |
| **G5** | `UNIQUE (provider, provider_uid)` (§2.3). | One identity resolving to several accounts |
| **G6** | Only the login flow and the authenticated `/auth/me/social-links` endpoints create `oauth_account` rows. | S1 |

"Admin-panel permission" means **any** permission at all — the User role holds none, so the test is
`permissions.length > 0`.

### 2.9 Instructor accounts and invite (BE-13)

`POST /admin/instructors` with `createAccount`, in **one transaction**:

1. `accountEmail` exists → 422, nothing written.
2. Insert `user`: `email`, `full_name`, **`password = null`**, `provider = 'email'`,
   `email_verified = false`, active. Login already rejects a null password (`auth.service.ts:74`), so
   no placeholder hash.
3. `setRole(user, Instructor)`.
4. Insert `instructor` linked, active.

Commit, **then** send the invite. An email for a rolled-back account is worse than a missing email,
which can be resent.

**Single-use reset:** reuse `forgotPassword` / `resetPassword` (`auth.service.ts:402, 441`). The
current hash is a stateless JWT reusable until expiry. Setting a password stamps
`user.password_changed_at`; `resetPassword` rejects a hash whose `iat` precedes it. Invite TTL 72h.

Role changes (`PUT /admin/users/:id/roles`) and account creation are written to the application log
with actor, target, from and to.

---

## 3. FE work

Repo `dna-academy-client`. Build against §1.

| # | Task | Size |
|---|---|---|
| **FE-1** | **`usePermission(module, action)`** backed by `GET /auth/me/permissions`, cached per user; refetch on login, token refresh and after a role change | 0.5d |
| **FE-2** | **Replace role gating with permissions.** `withPageRequiredAuth({ roles: [RoleEnum.ADMIN] })` on 6 admin pages and the admin check in `app-sidebar.tsx` both read `user.role.id === 1`. Gate each page on its module's `view` permission; show the admin-panel entry when `permissions.length > 0`. Without this an instructor cannot reach their own dashboard. | 1d |
| **FE-3** | **Students screen (R2).** Remove Edit; read-only `View` drawer; `Change role` modal calling `PUT /admin/users/:id/roles` with its 409s mapped to messages; `Deactivate` via `PATCH /users/:id/status`. Remove the role field from the create and edit forms. | 1.5d |
| **FE-4** | **Instructors screen (R1).** "Create login account" checkbox revealing `accountEmail`; account badge from `hasAccount` / `accountActivated`; `Resend invite` when `hasAccount && !accountActivated`. | 1d |
| **FE-5** | **Dashboard for scoped callers (R3).** Without `dashboard:view_students`: KPI cards and bars not clickable (no pointer, no hover), comments card hidden. Without `dashboard:export`: export hidden. `meta.scope === "own"`: "My courses only" chip. Scoped with empty data: *"The dashboard counts courses where you are the primary instructor."* | 0.5d |
| **FE-6** | **Co-instructor read-only (R4).** From `canEdit` / `myRole`: list row `View` instead of `Edit` and a role chip; editor inputs read-only, Save hidden, drag handles removed, banner *"You are a co-instructor on this course — read-only access."* Never a disabled Save without the banner. | 1.5d |
| **FE-7** | **Social login (R5).** Handle `409 social_link_requires_password` on the Facebook and Google buttons with the message and a link to password sign-in. Remove any Apple sign-in remnants. | 0.5d |
| **FE-8** | **Linked accounts in the profile (§1.4).** List links; link Facebook / Google; unlink with `409 last_login_method` handled. | 1d |
| **FE-9** | **Invite landing.** `/password-change?hash=` reused; copy reads "Set your password" when reached from an invite. | 0.5d |
| **FE-10** | i18n for every new label and error code | 0.5d |

**~8.5 days.**

**Principle for every gated control:** render it only when the permission is present. A control that
renders and then returns 403 is the defect this work removes — the server's 403 is the guarantee,
not the signal.

---

## 4. Acceptance criteria

### Security floor

| # | Actor | Action | Expected |
|---|---|---|---|
| AC-1 | any logged-in user | `POST /oauth-accounts` | 404 |
| AC-2 | User | `PATCH /lectures/:id`, `/student-profiles/:id`, `/permissions/:id` | 404 |
| AC-3 | Instructor | `GET /course-ratings`, `GET /quiz-attempts` | 404 |
| AC-4 | — | Second `oauth_account` with the same `(provider, provider_uid)` | constraint violation |
| AC-5 | anyone | `POST /auth/apple/login` | 404 |

### Roles

| # | Actor | Action | Expected |
|---|---|---|---|
| AC-6 | — | After migrations | every user has exactly one `user_role`; `user.role_id` equals it; role 3 absent |
| AC-7 | Admin | `PATCH /users/:id` on a User | 403 `STUDENT_PROFILE_IMMUTABLE` |
| AC-8 | Admin | `PATCH /users/:id` with `role` or `password` | 200, fields unchanged |
| AC-9 | Admin | `PUT /admin/users/:id/roles` User → Instructor | 200; one role; draft profile linked |
| AC-10 | Admin | Instructor with courses → User | 409 `instructor_has_courses` |
| AC-11 | Admin | Demote the last Admin, or own role | 409 |
| AC-12 | just-demoted Admin | next request to `/users` | 403 immediately |
| AC-13 | custom role holding `courses:edit_any` | edit any course | 200 |
| AC-14 | Instructor | `GET /auth/me/permissions` | `["courses:edit","courses:view","dashboard:view"]` |

### R1

| # | Actor | Action | Expected |
|---|---|---|---|
| AC-15 | Admin | Create instructor with account | user, role, profile created; invite sent after commit |
| AC-16 | Admin | Duplicate `accountEmail` | 422; no rows written |
| AC-17 | invitee | Use the invite link twice | second use `422 invalidHash` |

### R3 / R4

| # | Actor | Action | Expected |
|---|---|---|---|
| AC-18 | Instructor | `/admin/dashboard/kpis` | own primary courses only; `meta.scope = "own"` |
| AC-19 | Instructor | `/students`, `/reflection/comments`, `/export` | 403 |
| AC-20 | Instructor, primary on nothing | dashboard | empty shape, not platform totals |
| AC-21 | Primary | edit own course / publish it | 200 / 403 |
| AC-22 | Primary | edit a course they do not teach | 404 |
| AC-23 | Co-instructor | edit course, section, lecture, content | 403 `CO_INSTRUCTOR_READ_ONLY` |
| AC-24 | Co-instructor | `GET /admin/courses/:id` | 200, `canEdit: false` |
| AC-25 | Instructor | open the admin panel in the client | dashboard and own courses reachable |

### R5

| # | Actor | Action | Expected |
|---|---|---|---|
| AC-26 | new person | Facebook login, no matching email | new User, linked |
| AC-27 | existing verified learner | Facebook login, same email | signed into the existing account; link saved |
| AC-28 | — | unverified email+password account exists; email owner signs in with Facebook | linked; old password cleared; sessions revoked |
| AC-29 | — | Google account with `email_verified = false` | not matched; new account |
| AC-30 | — | social email matches an Admin or Instructor | 409 `social_link_requires_password` |
| AC-31 | Admin, signed in with password | `POST /auth/me/social-links/facebook` | 201; next Facebook login signs in |
| AC-32 | returning Google user | Google login | resolved by link; email unchanged |
| AC-33 | account with no password and one link | unlink it | 409 `last_login_method` |

---

## 5. Open decisions

| # | Question | Recommended |
|---|---|---|
| O1 | Invite link lifetime | 72 hours |
| O2 | Should an instructor also be able to learn? | Out of V1 under D3. But enrollment and the player require only a login, not the User role — check whether an instructor can already enroll, and decide whether that is intended, before relying on D3 to prevent it. |

---

*End of the Permission Model.*
