# Epic 1 — Authentication & Student Onboarding

## Stack
- **BE**: NestJS (brocoders/nestjs-boilerplate, relational/PostgreSQL variant)
- **FE**: Next.js (brocoders/extensive-react-boilerplate)
- **DB**: PostgreSQL via TypeORM

## DB Tables Involved
- `users` — unified user table (students, admins, instructors)
- `oauth_accounts` — Facebook OAuth links
- `student_profiles` — education_stage_code_id FK → master_data_code
- `student_career_interests` — M2M user ↔ career interest code
- `master_data_code` / `master_data_group` — configurable lookup values

---

## BE Tasks

### 1. Facebook OAuth — Register / Sign In

**Generate entity (skip — `User` already exists in boilerplate)**

Generate `OauthAccount` entity:
```
npm run generate:resource:relational -- --name OauthAccount
npm run add:property:to-relational -- --name OauthAccount --property provider --kind primitive --type string --isAddToDto true --isOptional false --isNullable false
npm run add:property:to-relational -- --name OauthAccount --property providerUid --kind primitive --type string --isAddToDto true --isOptional false --isNullable false
npm run add:property:to-relational -- --name OauthAccount --property accessToken --kind primitive --type string --isAddToDto false --isOptional true --isNullable true
npm run add:property:to-relational -- --name OauthAccount --property refreshToken --kind primitive --type string --isAddToDto false --isOptional true --isNullable true
npm run add:property:to-relational -- --name OauthAccount --property tokenExpiresAt --kind primitive --type Date --isAddToDto false --isOptional true --isNullable true
npm run add:property:to-relational -- --name OauthAccount --property user --kind reference --type User --referenceType manyToOne --isAddToDto false --isOptional false --isNullable false --shouldAutoLoad false
```

**Implement `POST /auth/facebook`**
- Accept `{ accessToken: string }` from FE
- Call Facebook Graph API: `GET https://graph.facebook.com/me?fields=id,name,email,picture`
- Lookup `oauth_accounts` by `(provider='facebook', provider_uid=fbUser.id)`
- If found → load linked `users` row → generate JWT pair
- If not found → create `users` row (full_name, email if provided, profile_picture_url from picture.data.url) → create `oauth_accounts` row → generate JWT pair
- **Do NOT overwrite** manually updated user fields on subsequent logins unless user explicitly approves
- Return: `{ token, refreshToken, tokenExpires, user }`

**Guard rule**: if `users.onboarding_done = false` after login → response must include `{ requiresOnboarding: true }`

---

### 2. Email Registration

Boilerplate already provides `POST /auth/email/register` — extend it:

- Add `fullName` field (already in boilerplate `User`)
- After account creation, auto-create `student_profiles` row linked to the new user (with `education_stage_code_id = NULL`, `onboarding_done = false`)
- Send email verification (boilerplate mail flow already handles this)
- Mark `users.email_verified = true` upon successful verification

---

### 3. Student Profile Onboarding — `PATCH /auth/profile/onboarding`

**Generate `StudentProfile` entity:**
```
npm run generate:resource:relational -- --name StudentProfile
npm run add:property:to-relational -- --name StudentProfile --property user --kind reference --type User --referenceType oneToOne --isAddToDto false --isOptional false --isNullable false --shouldAutoLoad false
npm run add:property:to-relational -- --name StudentProfile --property educationStageCodeId --kind primitive --type string --isAddToDto true --isOptional true --isNullable true
npm run add:property:to-relational -- --name StudentProfile --property age --kind primitive --type number --isAddToDto true --isOptional true --isNullable true
npm run add:property:to-relational -- --name StudentProfile --property dateOfBirth --kind primitive --type Date --isAddToDto true --isOptional true --isNullable true
```

**Generate `StudentCareerInterest` entity:**
```
npm run generate:resource:relational -- --name StudentCareerInterest
npm run add:property:to-relational -- --name StudentCareerInterest --property user --kind reference --type User --referenceType manyToOne --isAddToDto false --isOptional false --isNullable false --shouldAutoLoad false
npm run add:property:to-relational -- --name StudentCareerInterest --property careerInterestCodeId --kind primitive --type string --isAddToDto true --isOptional false --isNullable false
npm run add:property:to-relational -- --name StudentCareerInterest --property customInterest --kind primitive --type string --isAddToDto true --isOptional true --isNullable true
```

**Endpoint logic `PATCH /auth/profile/onboarding`** (JWT required):
- Accept: `{ educationStageCodeId, age?, dateOfBirth?, careerInterestIds: string[], customInterest? }`
- Validate `educationStageCodeId` exists in `master_data_code` (group_key = `education_stage`)
- Validate each `careerInterestIds[i]` exists in `master_data_code` (group_key = `career_interest`)
- Upsert `student_profiles` row
- Replace `student_career_interests` rows for this user
- Set `users.onboarding_done = true`

**`GET /auth/profile/me`** — return merged user + student_profile + career interests (pre-populate for FE form)

---

### 4. Onboarding Guard

Create `OnboardingGuard` (NestJS Guard):
- Attaches to all student-facing routes that require complete profile
- If `user.onboarding_done = false` → return `403` with `{ code: 'ONBOARDING_REQUIRED' }`
- FE redirects to `/onboarding` page on this error code

---

### 5. Resend Email Verification

**Context**: `POST /auth/email/register` sends a verification email as a side effect (§2). Mail delivery can fail transiently (SMTP hiccup, spam filter, user mistyped-then-fixed their inbox) and the original token also expires (`auth.confirmEmailExpires`) — in both cases the user is stuck `emailVerified: false` / `status: inactive` with no way to get a new link.

**`POST /auth/email/confirm/resend`**
- Accept `{ email: string }`
- Look up the user by email:
  - Not found → `422 { errors: { email: 'emailNotExists' } }`
  - Found but already confirmed (`status !== inactive`) → `422 { errors: { email: 'emailAlreadyConfirmed' } }` (covers both a normal confirmed account and a Facebook/Google/Apple account, which is created pre-verified)
- Otherwise, issue a fresh `confirmEmailUserId` JWT (same secret/expiry as register) and send the **same** verification email template used by register (`MailService.userSignUp`)
- Response: `204 No Content`
- No rate limiting is applied — acceptable for this boilerplate's scope, but worth flagging if this ships to a public-facing form (an attacker could otherwise use it to spam an arbitrary inbox).

---

## FE Tasks

### Pages & Components

**`/auth/login`**
- Email/password form (uses boilerplate auth flow)
- "Continue with Facebook" button → calls `POST /auth/facebook` with FB SDK access token
- On response `requiresOnboarding: true` → redirect to `/onboarding`

**`/auth/register`**
- Full name, email, password, password confirmation, Terms checkbox
- On success → show "check your email" message

**`/onboarding`** (protected, only accessible if `onboarding_done = false`)
- Step form (or single page):
  1. Pre-populate: full_name, email, profile_picture from `GET /auth/profile/me`
  2. Fields to fill in only if missing:
     - Education stage → `<Select>` options from `GET /master-data/codes?groupKey=education_stage`
     - Career interests → `<MultiSelect>` from `GET /master-data/codes?groupKey=career_interest`, allow "Other" + custom text input, max configurable selections
     - Age or date of birth
  3. Submit → `PATCH /auth/profile/onboarding` → redirect to `/dashboard` or course catalog

**State management**: store `user`, `onboarding_done`, `requiresOnboarding` in auth context/store (boilerplate already has auth context).

---

## API Contract Summary

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/auth/facebook/login` | None | Facebook OAuth register/login |
| POST | `/auth/email/register` | None | Email registration |
| POST | `/auth/email/login` | None | Email login (boilerplate) |
| POST | `/auth/email/confirm` | None | Email verification (boilerplate) |
| POST | `/auth/email/confirm/resend` | None | Resend the email verification link |
| GET | `/auth/profile/me` | JWT | Get current user + profile |
| PATCH | `/auth/profile/onboarding` | JWT | Complete onboarding |
| GET | `/master-data-codes?groupKey=...` | JWT | Lookup codes for dropdowns |

> Full request/response payloads and error shapes: see [API Guide](#api-guide-for-fe-integration) below.

---

## Acceptance Criteria Mapping

| Requirement | Implementation |
|---|---|
| Facebook button displayed on login/register page | FE `/auth/login` — "Continue with Facebook" button |
| Auto-populate full_name, email, picture from Facebook | `POST /auth/facebook` maps FB Graph fields to `users` |
| Do not overwrite manually updated fields on re-login | BE checks `user.onboarding_done` flag before overwriting |
| Email registration creates profile with full_name + email | `POST /auth/email/register` auto-creates `student_profiles` |
| Require education_stage, career_interest, age/dob if missing | `PATCH /auth/profile/onboarding` validates required fields |
| Allow multi-select career interests up to configured limit | FE MultiSelect, BE validates count |
| Allow custom career interest when "Other" selected | `customInterest` field in `StudentCareerInterest` |
| Redirect to onboarding if profile incomplete before enroll | `OnboardingGuard` on enrollment endpoints |

---

## API Guide (for FE integration)

Everything below reflects the **actual running implementation** (verified against a live server), not just the original spec above. Interactive docs: `http://localhost:3001/docs` · raw OpenAPI JSON: `http://localhost:3001/docs-json`.

### Conventions

- Base path: `/api/v1` (e.g. `http://localhost:3001/api/v1/auth/email/login`).
- Auth: `Authorization: Bearer <token>` header, using the `token` returned by login/register-then-login/Facebook login.
- All bodies are JSON (`Content-Type: application/json`).
- **Validation errors** (`422 Unprocessable Entity`) always look like:
  ```json
  { "status": 422, "errors": { "<field>": "<errorCode>" } }
  ```
- **Onboarding-guard errors** (`403 Forbidden`, from `OnboardingGuard` on protected routes such as `POST /enrollments`) look like:
  ```json
  { "code": "ONBOARDING_REQUIRED" }
  ```
  FE should catch this specific shape and redirect to `/onboarding`.
- Missing/invalid JWT → standard `401 Unauthorized`.

### 1. `POST /auth/email/register`

Register a student with email + password. Creates the user (inactive, `onboardingDone: false`) plus an empty `student_profiles` row, and emails a verification link.

Request:
```json
{ "email": "ada@example.com", "password": "secret1", "firstName": "Ada", "lastName": "Lovelace" }
```

Response: `204 No Content` (no body).

Errors: `422 { errors: { email: "emailAlreadyExists" } }`.

### 2. `POST /auth/email/confirm`

Confirms the email address using the `hash` query param from the verification email link.

Request: `{ "hash": "<token from email link>" }`

Response: `204 No Content`.

Errors: `422 { errors: { hash: "invalidHash" } }` · `404` if already confirmed / user not found.

### 3. `POST /auth/email/confirm/resend`

For an account stuck unverified — original email never arrived, or its token expired. Issues a new token and re-sends the exact same template as register.

Request: `{ "email": "ada@example.com" }`

Response: `204 No Content`.

Errors:
- `422 { errors: { email: "emailNotExists" } }` — no account with that email.
- `422 { errors: { email: "emailAlreadyConfirmed" } }` — account is already verified (includes Facebook/Google/Apple accounts, which are created pre-verified and can never hit this endpoint's happy path).

FE: show this as a "Resend verification email" link/button on the "check your email" screen after register, and again on login if `POST /auth/email/login` succeeds but the returned `user.emailVerified` is `false` (boilerplate currently allows login before confirmation — see §3 below).

### 4. `POST /auth/email/login`

Request: `{ "email": "ada@example.com", "password": "secret1" }`

Response `200`:
```json
{
  "token": "<JWT access token>",
  "refreshToken": "<JWT refresh token>",
  "tokenExpires": 1786088749037,
  "requiresOnboarding": true,
  "user": {
    "id": 32,
    "email": "ada@example.com",
    "fullName": "Ada Lovelace",
    "firstName": "Ada",
    "lastName": "Lovelace",
    "profilePictureUrl": null,
    "age": null,
    "dateOfBirth": null,
    "emailVerified": false,
    "onboardingDone": false,
    "provider": "email",
    "socialId": null,
    "role": { "id": 2, "name": "User" },
    "status": { "id": 2, "name": "Inactive" },
    "createdAt": "2026-08-07T07:30:48.733Z",
    "updatedAt": "2026-08-07T07:30:48.733Z"
  }
}
```

**`requiresOnboarding: true` → FE must redirect to `/onboarding`.**

Errors: `422` with `errors.email` = `"notFound"` or `"needLoginViaProvider:<provider>"`, or `errors.password` = `"incorrectPassword"`.

### 5. `POST /auth/facebook/login`

> Note: the route is `/auth/facebook/login`, not `/auth/facebook` (differs from the earlier contract table / original spec).

Send the Facebook SDK access token:
```json
{ "accessToken": "<Facebook SDK access token>" }
```

Response: `200`, **same shape as email login** (`token`, `refreshToken`, `tokenExpires`, `user`, `requiresOnboarding`).

Behavior:
- Looks up `oauth_accounts` by `(provider='facebook', providerUid=<Facebook user id>)`.
- **Existing link** → logs in with the linked user as-is; does **not** touch any user fields (manual edits are preserved).
- **No link, but a user exists with the same email** → links the new `oauth_accounts` row to that existing user (no duplicate account).
- **No link, no matching user** → creates a new user (`fullName` from FB first/last name, `profilePictureUrl` from `picture.data.url`, `emailVerified: true`, `onboardingDone: false`) and an `oauth_accounts` link.

### 6. `GET /auth/profile/me`

Auth required. Use this to pre-populate the `/onboarding` form and to check `user.onboardingDone`.

Response `200`:
```json
{
  "user": { "...": "same User shape as login, including email" },
  "studentProfile": {
    "id": "fcb83461-eaf8-41a6-bb66-235b0cb9f21c",
    "educationStageCode": null,
    "user": { "...": "User" },
    "createdAt": "2026-08-07T07:30:48.754Z",
    "updatedAt": "2026-08-07T07:30:48.754Z"
  },
  "careerInterests": []
}
```

`studentProfile` is never `null` for a registered user (auto-created on register); `educationStageCode` is `null` until onboarding is completed. `careerInterests` is `[]` until onboarding is completed.

### 7. `PATCH /auth/profile/onboarding`

Auth required. Completes (or edits) the student profile.

Request:
```json
{
  "educationStageCodeId": "<uuid from GET /master-data-codes?groupKey=education_stage>",
  "careerInterestIds": ["<uuid>", "<uuid>"],
  "age": 16,
  "dateOfBirth": "2010-05-01",
  "customInterest": "Robotics"
}
```

- `educationStageCodeId` — required, must be an id from the `education_stage` group.
- `careerInterestIds` — required, non-empty array, each id must be from the `career_interest` group.
- `age` / `dateOfBirth` — at least one required **unless the user already has one on file** from a prior submission.
- `customInterest` — optional; only persisted against whichever selected career-interest code has `code === "other"` (case-insensitive). Other selections always get `customInterest: null`.
- **Resubmitting replaces** the education stage and the full set of career interests (not additive).

Response `200`: same shape as `GET /auth/profile/me`, with `user.onboardingDone: true`.

Errors (`422`):
- `errors.educationStageCodeId = "notExists"` — unknown id, wrong group, or inactive code.
- `errors.careerInterestIds = "notExists:<id>"` — one of the ids is unknown, wrong group, or inactive.
- `errors.age = "ageOrDateOfBirthRequired"` — neither `age` nor `dateOfBirth` given, and none on file.

### 8. `GET /master-data-codes?groupKey=...`

Auth required (any logged-in user). Source for the onboarding `<Select>` / `<MultiSelect>` options.

Query params: `groupKey` (e.g. `education_stage`, `career_interest`), `page` (default 1), `limit` (default 10, max 50). Results are sorted by `displayOrder` ascending.

Response `200`:
```json
{
  "data": [
    {
      "id": "86812df1-2423-410c-8383-44dd67fd6aaa",
      "code": "high_school",
      "name": "High School",
      "description": null,
      "thumbnailUrl": null,
      "displayOrder": 1,
      "isActive": true,
      "group": { "id": "...", "groupKey": "education_stage", "name": "...", "isActive": true },
      "createdAt": "...",
      "updatedAt": "..."
    }
  ],
  "hasNextPage": false
}
```

Include an option whose `code` is `"other"` in the `career_interest` group to trigger the FE's custom-text input (paired with `customInterest` in the onboarding submit).

### 9. Onboarding guard on protected actions

Endpoints that require a completed profile (e.g. `POST /enrollments`) are wrapped in `OnboardingGuard`. While `user.onboardingDone` is `false`, they respond `403`:
```json
{ "code": "ONBOARDING_REQUIRED" }
```
FE should special-case this response and redirect to `/onboarding`; once onboarding completes, the same call proceeds normally (falls through to normal validation/business logic).

### Suggested FE flow

1. `/auth/register` → on `204`, show "check your email", with a "Didn't get it? Resend" link/button → `POST /auth/email/confirm/resend`.
2. `/auth/login` (email form, or "Continue with Facebook" → `POST /auth/facebook/login`) → store `token`/`refreshToken`; if `requiresOnboarding` is `true`, redirect to `/onboarding`.
3. `/onboarding` → `GET /auth/profile/me` to prefill (`fullName`, `email`, `profilePictureUrl`); `GET /master-data-codes?groupKey=education_stage` and `?groupKey=career_interest` for the dropdowns; submit `PATCH /auth/profile/onboarding`.
4. Any protected call that returns `403 { code: "ONBOARDING_REQUIRED" }` → redirect to `/onboarding`.

---

## Add new API: Resend the email verification ✅ Implemented

> Original ask: "When register new account completed, it will send the email verification for this user email. New requirement: sometimes the email does not send, create the new api to resend this email."

Implemented as `POST /auth/email/confirm/resend` — see BE Task 5 above for the spec and API Guide §3 for the request/response contract.