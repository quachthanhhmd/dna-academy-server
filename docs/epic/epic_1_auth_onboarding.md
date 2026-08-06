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
| POST | `/auth/facebook` | None | Facebook OAuth register/login |
| POST | `/auth/email/register` | None | Email registration |
| POST | `/auth/email/login` | None | Email login (boilerplate) |
| POST | `/auth/email/confirm` | None | Email verification (boilerplate) |
| GET | `/auth/profile/me` | JWT | Get current user + profile |
| PATCH | `/auth/profile/onboarding` | JWT | Complete onboarding |

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
