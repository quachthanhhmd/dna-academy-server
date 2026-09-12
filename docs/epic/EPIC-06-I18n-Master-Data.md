# EPIC 6 — Bilingual (VI / EN) Support for Master Data

> **Goal:** Enable the platform to display all master-data-driven text (course levels, categories, course groups, education stages, career interests, instructor expertise, personality DNA types, assessment options, etc.) in **Vietnamese (default) and English**, using a **JSONB translation column** strategy. Admins can maintain translations from the existing `ADM_MAS_13` Master Data screen; students can switch UI language from a header switcher, with their preference persisted on `users.locale`.

**Epic owner:** Product / Platform
**Depends on:** EPIC 3 (Master Data), EPIC 5 (Instructor Management — for instructor expertise localization)
**Impacted personas:** Admin, Student, Guest
**Storage strategy:** JSONB translation columns on `master_data_group` and `master_data_code`. The existing `name` / `description` columns hold the **default locale (VI)** and act as fallback. Additional locales live inside `name_translations` / `description_translations` as `{ "<locale>": "<value>" }`.
**Impacted screens (existing):**
`ADM_MAS_13` (major), `ADM_SHL_11` (add language switcher), `STU_PRO_02`, `STU_CAT_03`, `STU_OVR_04`, `STU_MYC_05`, `ADM_CRS_14`, `ADM_DCR_17`, `ADM_DRF_18`, `ADM_USR_19` (Instructors tab expertise chips).
**New screens:** _None._

---

## Table of Contents

1. [Scope & User Stories](#1-scope--user-stories)
2. [BE Work](#2-be-work)
3. [FE Work](#3-fe-work)
4. [API Integration](#4-api-integration)
5. [Acceptance Criteria](#5-acceptance-criteria-epic-level)
6. [Out of Scope (V1)](#6-out-of-scope-v1)

---

## 1. Scope & User Stories

**Convention used throughout this epic:**
- `code` and `group_key` are **stable identifiers**, never translated.
- `name` (and `description`) columns store the **default locale = `vi`**.
- `name_translations` / `description_translations` store overrides for all **other** locales as JSONB: `{"en": "Beginner"}`.
- Rendering rule: `display = coalesce(name_translations->>locale, name)` — a missing translation silently falls back to VI so the app never shows blank text.
- Supported locales in V1: **`vi`** (default), **`en`**. `locale` values are ISO 639-1 codes.

| ID | Story | Persona | Screen |
|---|---|---|---|
| UC-I18N-01 | Add / edit an English translation for a master data group | Admin | `ADM_MAS_13` |
| UC-I18N-02 | Add / edit an English translation for a master data code | Admin | `ADM_MAS_13` |
| UC-I18N-03 | See which entries are missing an English translation | Admin | `ADM_MAS_13` |
| UC-I18N-04 | Switch UI language between VI and EN | Student / Admin | Header (`ADM_SHL_11` + student layout) |
| UC-I18N-05 | Persist my preferred language across sessions | Student / Admin | Any authenticated screen |
| UC-I18N-06 | See course level / category / group in my chosen language | Student / Guest | `STU_CAT_03`, `STU_OVR_04` |
| UC-I18N-07 | See instructor expertise chips in my chosen language | Student / Guest | `STU_OVR_04`, `STU_CAT_03` filter |
| UC-I18N-08 | See education stage & career interest labels in my chosen language | Student | `STU_PRO_02`, `STU_MYC_05` |
| UC-I18N-09 | Fall back gracefully when a translation is missing | All | Everywhere master data is rendered |
| UC-I18N-10 | Have new master data entries be forced to include at least the default locale | Admin | `ADM_MAS_13` create/edit form |

---

## 2. BE Work

### 2.1 Database changes

#### 2.1.1 Add JSONB translation columns

```sql
BEGIN;

-- master_data_group
ALTER TABLE "master_data_group"
  ADD COLUMN "name_translations"        jsonb NOT NULL DEFAULT '{}',
  ADD COLUMN "description_translations" jsonb NOT NULL DEFAULT '{}';

-- master_data_code
ALTER TABLE "master_data_code"
  ADD COLUMN "name_translations"        jsonb NOT NULL DEFAULT '{}',
  ADD COLUMN "description_translations" jsonb NOT NULL DEFAULT '{}';

-- Users: preferred UI locale
ALTER TABLE "users"
  ADD COLUMN "locale" varchar(10) NOT NULL DEFAULT 'vi';

COMMIT;
```

#### 2.1.2 Indexes to keep localized reads fast

```sql
-- Frequent filter: fetch codes by group_id + is_active + display_order
CREATE INDEX IF NOT EXISTS idx_mdc_group_active_order
  ON "master_data_code" ("group_id", "is_active", "display_order");

-- Optional: partial GIN index if you plan full-text search over EN names later
-- CREATE INDEX idx_mdc_name_translations_gin ON master_data_code USING gin (name_translations);
```

> `name_translations` is small (2 keys) — plain reads via `->>` do not need an index. Add GIN only if you introduce search-by-translated-name features.

#### 2.1.3 Backfill existing data

Populate `name_translations.vi` from the current `name` column so every row has a consistent shape. Do the same for `description`:

```sql
UPDATE "master_data_group"
SET name_translations        = jsonb_build_object('vi', name),
    description_translations = CASE WHEN description IS NOT NULL
                                    THEN jsonb_build_object('vi', description)
                                    ELSE '{}'::jsonb END
WHERE name_translations = '{}'::jsonb;

UPDATE "master_data_code"
SET name_translations        = jsonb_build_object('vi', name),
    description_translations = CASE WHEN description IS NOT NULL
                                    THEN jsonb_build_object('vi', description)
                                    ELSE '{}'::jsonb END
WHERE name_translations = '{}'::jsonb;
```

#### 2.1.4 Data integrity constraints

Ensure the default locale is always present in the JSONB blob:

```sql
ALTER TABLE "master_data_group"
  ADD CONSTRAINT ck_mdg_name_has_default_locale
  CHECK (name_translations ? 'vi');

ALTER TABLE "master_data_code"
  ADD CONSTRAINT ck_mdc_name_has_default_locale
  CHECK (name_translations ? 'vi');
```

> Application layer must always write `name_translations->>'vi'` when creating or updating a row. The DB constraint is the last line of defense.

#### 2.1.5 Optional helper view for consumer queries

```sql
-- Convenience view — the BE app layer can use this to avoid repeating COALESCE
CREATE OR REPLACE VIEW v_master_data_code AS
SELECT
  c.id,
  c.group_id,
  c.code,
  c.name                        AS name_default,
  c.name_translations,
  c.description                 AS description_default,
  c.description_translations,
  c.thumbnail_url,
  c.is_active,
  c.display_order,
  c.created_at,
  c.updated_at
FROM master_data_code c;
```

### 2.2 API changes

#### 2.2.1 Locale resolution chain (applied by every endpoint that returns localized text)

Order of precedence, first match wins:

1. `?locale=<code>` query parameter (explicit override — highest priority).
2. `X-Locale` request header.
3. Authenticated user's `users.locale` value.
4. `Accept-Language` HTTP header (parse first supported value).
5. Default `vi`.

The resolved locale must be echoed back in the response envelope so the FE can detect fallback: `"resolved_locale": "en"`.

#### 2.2.2 Endpoints to CHANGE

| Endpoint | Change |
|---|---|
| `GET /api/master-data/groups` | Accept `?locale=`. Response items include `name` (localized), `description` (localized), plus `name_translations` and `description_translations` **only** for admin callers. |
| `GET /api/master-data/{group_key}` | Same as above; return the localized code list. |
| `GET /api/admin/master-data/groups` | Always returns full `name_translations` and `description_translations` regardless of locale (needed by the admin editor). |
| `GET /api/admin/master-data/{group_key}` | Same admin behavior — return all translations. |
| `POST /api/admin/master-data/groups`<br>`PUT  /api/admin/master-data/groups/{id}` | Request body accepts `name_translations` (object). Server validates that `name_translations.vi` is present and non-empty. |
| `POST /api/admin/master-data/{group_key}/codes`<br>`PUT  /api/admin/master-data/{group_key}/codes/{id}` | Same — enforce `name_translations.vi` presence. |
| `GET /api/courses` (catalog) | Localize `level.name`, `category.name`, `groups[].name`, and `primary_instructor.expertise[].name` inside the response using the resolved locale. |
| `GET /api/courses/{slug}` (overview) | Same as above plus `co_instructors[].expertise[].name`. |
| `GET /api/students/me/profile` | Localize `education_stage.name`, `career_interests[].name`. |
| `GET /api/students/me/enrollments` | Localize course-side master data fields returned in the card. |
| `GET /api/admin/instructors` / `.../{id}` | Localize `expertise[].name` for student-facing calls; admin-scoped detail returns raw translations too. |
| `GET /api/admin/dashboard/courses` | Localize grouping labels (level, category). |
| `GET /api/students/assessment/sections` (if EPIC 7 is in progress) | Localize option labels sourced from master data via `options_from_group_key`. |
| `PATCH /api/students/me/locale` | **New** — set the caller's preferred UI locale. Body: `{ "locale": "en" }`. Rejects unknown locales (`400 unsupported_locale`). |

#### 2.2.3 Endpoints to ADD

| Method | Path | Purpose |
|---|---|---|
| `GET`   | `/api/i18n/locales` | Return the list of supported locales, e.g. `[{"code":"vi","name":"Tiếng Việt","is_default":true},{"code":"en","name":"English","is_default":false}]`. Used by the header language switcher. |
| `PATCH` | `/api/students/me/locale` | Persist locale on `users.locale`. Returns updated `me` payload. |
| `GET`   | `/api/admin/master-data/{group_key}/translation-coverage` | Return per-locale coverage stats for the admin dashboard: `{ "en": { "total": 42, "translated": 30, "missing_ids": [...] } }`. Used by the "missing translation" indicator. |

#### 2.2.4 DTO reference

```jsonc
// Public list item (student-facing, ?locale=en)
{
  "id": "uuid",
  "code": "beginner",
  "name": "Beginner",
  "description": "For learners with no prior experience.",
  "thumbnail_url": null,
  "display_order": 1
}

// Admin list item (always full translations)
{
  "id": "uuid",
  "code": "beginner",
  "name": "Cơ bản",                                // default locale value
  "name_translations":        { "vi": "Cơ bản", "en": "Beginner" },
  "description": "Dành cho người mới bắt đầu.",
  "description_translations": { "vi": "Dành cho người mới bắt đầu.",
                                "en": "For learners with no prior experience." },
  "is_active": true,
  "display_order": 1
}

// Create / update master data code (admin request body)
{
  "code": "beginner",                              // immutable after creation if referenced
  "name_translations":        { "vi": "Cơ bản", "en": "Beginner" },
  "description_translations": { "vi": "…",       "en": "…"        },
  "thumbnail_url": null,
  "is_active": true,
  "display_order": 1
}

// Standard envelope for any localized response
{
  "resolved_locale": "en",
  "fallback_locale": "vi",
  "data": [ /* ... */ ]
}
```

#### 2.2.5 Validation rules (BE-enforced)

- `name_translations.vi` is **required** and must be non-empty on create and on every update. Missing → `400 default_locale_required`.
- Unknown locale keys inside `name_translations` / `description_translations` are **rejected** at write time (`400 unsupported_locale_key`). The supported set is served by `GET /api/i18n/locales`.
- `users.locale` PATCH: only values from the supported list are accepted.
- Locale resolution never returns an unsupported locale; unknown request locales silently fall back to `vi` and the envelope reports `resolved_locale: "vi"` so the FE knows.
- `GET /api/admin/master-data/{group_key}/translation-coverage` uses the same supported set; excludes inactive codes by default (`?include_inactive=true` to include).

### 2.3 Application-layer helper (BE code)

Add a shared utility so every localized read uses the same fallback rule. Pseudocode:

```ts
function pickLocalized(row, locale, field /* 'name' | 'description' */) {
  const bag = row[`${field}_translations`] ?? {};
  return bag[locale] ?? bag['vi'] ?? row[field];
}
```

Wrap this in the ORM mapper so any downstream serializer that emits a master-data-derived name goes through it — otherwise fields will silently regress to VI.

### 2.4 Files / schemas to update

- `DNA-academy.sql` — apply Section 2.1.1, 2.1.2, 2.1.3, 2.1.4.
- Migration file: `2026_08_29_add_i18n_to_master_data.sql` (single transaction).
- ORM models: `MasterDataGroup`, `MasterDataCode`, `User` — add `name_translations`, `description_translations`, `locale`. Mark JSONB columns as typed `Record<string, string>`.
- Seed scripts: every existing seed of `master_data_group` / `master_data_code` must include `name_translations` for BOTH `vi` and `en`. Backfill script (2.1.3) covers already-deployed data.
- Add `locales` seed / config (JSON or DB config table) with `[{code:'vi', name:'Tiếng Việt', is_default:true}, {code:'en', name:'English'}]`.

### 2.5 Response caching

- CDN / API gateway cache keys **must include** the resolved locale (append `?locale=` to cache key or use `Vary: X-Locale, Accept-Language`). Otherwise EN users will receive VI cache and vice-versa.
- Invalidate cached master data lists on any admin write to `master_data_group` / `master_data_code`.

---

## 3. FE Work

### 3.1 Setup — i18n foundation

- Install and configure an i18n library matching the stack: `react-i18next` (React), `vue-i18n` (Vue), or equivalent.
- Create resource files: `src/i18n/vi.json`, `src/i18n/en.json` — cover **UI-chrome strings only** (buttons, headings, form labels). Master data text stays server-driven (via `name_translations`) and MUST NOT be duplicated into these files.
- Create a `LocaleProvider` / `useLocale()` hook that exposes: `currentLocale`, `setLocale(code)`, `supportedLocales`.
- Locale resolution on FE boot:
  1. If authenticated → `users.locale` from `GET /me`.
  2. Else → `localStorage.locale`.
  3. Else → `navigator.language`.
  4. Else → `vi`.
- Persist changes:
  - Authenticated → `PATCH /api/students/me/locale` + update local state.
  - Guest → `localStorage.locale` only.
- Every outbound API call adds `X-Locale: <currentLocale>` header (interceptor pattern).

### 3.2 Shared FE helper for rendering master data

```ts
// Master data items always come with a { name, name_translations? } shape.
export function localizedName(
  item: { name: string; name_translations?: Record<string, string> },
  locale: string,
  fallback: string = 'vi'
): string {
  return item.name_translations?.[locale]
      ?? item.name_translations?.[fallback]
      ?? item.name;
}
```

- Every existing render of `item.name` on a master-data-derived value **must** be replaced with `localizedName(item, currentLocale)`.
- Create a `<Localized />` component for JSX ergonomics: `<Localized item={course.level} />`.
- Search / autocomplete over master data (course filter, admin picker) must match against **both** VI and EN values — filter the merged strings client-side, or send `?locale=` and let the server pre-localize.

### 3.3 New shared FE components

- `<LanguageSwitcher />` — dropdown in the top navigation with the flag / label of each supported locale. On change: calls `setLocale`, refetches active queries (React Query / SWR `refetch`), and triggers `PATCH /me/locale` when logged in.
- `<TranslationInputs />` — reusable form widget used by the master data editor (see 3.4). Renders one input per supported locale side-by-side with per-locale required indicator.
- `<TranslationCoverageBadge />` — shows `● 30 / 42 EN` beside a group title in the admin master data list.

### 3.4 Screens summary

| Screen ID | Action | Notes |
|---|---|---|
| `ADM_MAS_13` Master Data | **Modify (major)** | Create/edit form gains `<TranslationInputs />` for name + description; list view shows a small ⚠️ badge on rows missing EN; header shows overall coverage badge |
| `ADM_SHL_11` Admin Shell | **Modify (medium)** | Add `<LanguageSwitcher />` in the top-right corner of the shell; menu labels wired to i18n resource files |
| Student layout header | **Modify (medium)** | Same `<LanguageSwitcher />` for the student surface |
| `STU_PRO_02` Student Profile Setup | Modify | Education-stage and career-interest dropdowns render via `localizedName()`; validation messages read from i18n resources |
| `STU_CAT_03` Course Catalog | Modify | Level, category, group, instructor expertise chips localized; filter dropdown labels localized; empty-state text via i18n resources |
| `STU_OVR_04` Course Overview | Modify | Level, category, group badges + instructor expertise chips localized; static labels via i18n resources |
| `STU_MYC_05` My Courses | Modify | Card metadata localized |
| `ADM_CRS_14` Course Creation | Modify | Level, category, group, instructor expertise pickers use `localizedName()` when displaying options |
| `ADM_DCR_17` Course Dashboard | Modify | Grouping labels localized |
| `ADM_DRF_18` Reflection Dashboard | Modify | Category labels localized |
| `ADM_USR_19` Users → Instructors tab | Modify | Expertise chips + filter dropdown localized |
| All other screens | Untouched | — |

### 3.5 Master Data editor (`ADM_MAS_13`) — detailed changes

#### 3.5.1 Create / Edit modal

Replace the single `Name` and `Description` inputs with the `<TranslationInputs />` widget:

```
┌────────────────────────────────────────────────────────────────┐
│  Edit Master Data Code — Course Level                          │
├────────────────────────────────────────────────────────────────┤
│  Code (stable)     [ beginner ]   🔒 (immutable after use)      │
│  Display order     [ 1 ]                                        │
│                                                                  │
│  Name                                                            │
│    🇻🇳 Vietnamese *  [ Cơ bản                       ]           │
│    🇬🇧 English       [ Beginner                     ]           │
│                                                                  │
│  Description                                                     │
│    🇻🇳 Vietnamese     [ Dành cho người mới bắt đầu.     ]        │
│    🇬🇧 English        [ For learners with no prior…     ]        │
│                                                                  │
│  Thumbnail        [ Upload / URL ]                              │
│  Status           (•) Active   ( ) Inactive                     │
│                                                                  │
│                                    [Save] [Cancel]              │
└────────────────────────────────────────────────────────────────┘
```

- Vietnamese input has an asterisk and inline validation: cannot save with empty VI value.
- English input is optional; if empty, tooltip shows "Falls back to Vietnamese."
- On save, FE sends the full `name_translations` object (both keys, dropping empty EN as an omitted key rather than `""`).

#### 3.5.2 List view

- Add a column `EN` with either the English name or a subtle ⚠️ "Missing" chip that opens the edit modal focused on the English input.
- Header shows a `<TranslationCoverageBadge />` for the currently open group: `English coverage: 30 / 42`.
- Filter dropdown: `Translation status = [All | Fully translated | Missing EN]`.

### 3.6 Header language switcher (`ADM_SHL_11` + student header)

- Position: top-right, near the user avatar.
- Displays the current locale name and flag.
- Dropdown lists supported locales fetched from `GET /api/i18n/locales`.
- On select:
  1. Update `LocaleProvider` state.
  2. Refetch all active master-data-backed queries (React Query `queryClient.invalidateQueries({ predicate: ...})`).
  3. If authenticated → `PATCH /api/students/me/locale` (fire-and-forget; do not block UI).
  4. Persist to `localStorage.locale` for guest continuity.
- No full page reload is required; components re-render from the new locale.

### 3.7 State & routing

- Add `localeSlice` to the FE store (or context): `{ currentLocale, supportedLocales, defaultLocale }`.
- URL strategy: **no locale in the path** for V1 (avoid a major routing rewrite). Locale is a global concern of the shell.
  - Trade-off documented: shared links do not carry a locale. This is acceptable in V1; can be added later via `/en/...` prefix without schema change.
- Query cache keys must include `currentLocale` so switching languages invalidates cached responses.
- The FE MUST NOT try to build client-side translation dictionaries for master data — always trust `name_translations` returned by the API.

### 3.8 UX / edge cases

- **Missing EN translation**: the fallback rule guarantees VI is shown; add a small `[VI]` marker chip when the current locale is EN but the value fell back — helps admins spot gaps.
- **Locale mismatch on login**: after login, if `users.locale` differs from the current UI, prompt once via a snackbar: "Switch to your saved language (EN)? [Yes] [Keep VI]".
- **Language switch mid-form**: warn the user if unsaved changes exist on the master data editor before switching (form drives translations of that very entity).
- **Rich-text description**: for now `description_translations` values are plain text. Rich-text expansion is a V2 concern.
- **Right-to-left**: not needed for VI/EN. If more locales added, keep this in mind.
- **Accessibility**: switcher is a proper `<select>` / listbox pattern, keyboard navigable; `<html lang>` attribute is updated when locale changes.

### 3.9 Analytics / tracking events

- `locale_switched` — `{ from, to, is_authenticated }`.
- `master_data_translation_saved` — `{ group_key, code, locales_provided: ["vi","en"] }`.
- `master_data_translation_missing_viewed` — fired when an admin opens the "Missing EN" filter.

---

## 4. API Integration

> Filled in by BE. Paths are prefixed `/api/v1`. Field names are **camelCase**
> (`nameTranslations`), matching the rest of the codebase — the snake_case in
> §2.2.4 is illustrative, not the wire format.

### 4.1 Locale resolution

First match wins: `?locale=` → `X-Locale` → authenticated `users.locale` →
`Accept-Language` → `vi`. Unsupported values are ignored rather than rejected,
so a bad locale silently falls back instead of 4xx-ing.

Every response carries `Content-Language: <resolved>` and
`Vary: X-Locale, Accept-Language, Authorization` — see §4.5 for the caching
rules this implies. **There is no `{resolvedLocale, data}` envelope** — adding one would have broken every Epic 3–5 contract, so the
resolved locale travels in the header instead (see the report's "needs
confirmation" section).

### 4.2 Endpoint map

| FE surface | Method | Endpoint | Notes |
|---|---|---|---|
| `<LanguageSwitcher />` options | `GET` | `/i18n/locales` | Public. `[{code,name,isDefault}]` |
| `<LanguageSwitcher />` persist | `PATCH` | `/auth/me/locale` | Body `{ "locale": "en" }` → full profile. 422 on unsupported |
| `ADM_MAS_13` groups | `GET` | `/admin/master-data/groups` | Items carry `name` (resolved) + `nameTranslations` |
| `ADM_MAS_13` codes | `GET` | `/admin/master-data/groups/{groupKey}/codes` | Same, plus `linkedCoursesCount` |
| `ADM_MAS_13` create | `POST` | `/admin/master-data/groups/{groupKey}/codes` | `nameTranslations` / `descriptionTranslations` |
| `ADM_MAS_13` update | `PATCH` | `/admin/master-data/groups/{groupKey}/codes/{id}` | Merge patch, see 4.3 |
| `ADM_MAS_13` coverage badge | `GET` | `/admin/master-data/groups/{groupKey}/translation-coverage` | `?includeInactive=true` optional |
| `STU_PRO_02` options | `GET` | `/master-data/codes?groupKey=` | Public; optional bearer token honours `users.locale` |
| `STU_CAT_03` / `STU_OVR_04` | `GET` | `/courses`, `/courses/{slug}` | `level.name`, `category.name` localized automatically |
| `ADM_CRS_14` pickers | `GET` | `/admin/master-data/groups/{groupKey}/codes` | — |
| Instructor expertise chips | `GET` | `/admin/instructors/{id}`, `/courses/{slug}` | `expertise[].name` localized |

### 4.3 Write semantics

```jsonc
// create — name is shorthand for the default locale
{ "code": "beginner",
  "nameTranslations":        { "vi": "Cơ bản", "en": "Beginner" },
  "descriptionTranslations": { "vi": "Dành cho người mới" },
  "displayOrder": 1, "isActive": true }
```

- `nameTranslations.vi` is **required**, directly or via the legacy `name`
  field. Missing → `422 { errors: { nameTranslations: "defaultLocaleRequired" } }`.
- `PATCH` is a **merge patch per locale**: sending `{"en":"Novice"}` leaves
  `vi` untouched. Sending `{"en":""}` **removes** the English translation and
  the label falls back to Vietnamese.
- An unsupported locale key → `422 unsupportedLocaleKey`.
- Name uniqueness within a group is still enforced, now on the **Vietnamese**
  value → `409 { errors: { name: "codeNameExistsInGroup" } }`.
- Legacy `{ code, name }` payloads keep working and are stored as
  `{ "vi": name }`.

### 4.4 Coverage response

```jsonc
{ "vi": { "total": 42, "translated": 42, "missingIds": [] },
  "en": { "total": 42, "translated": 30, "missingIds": ["uuid", "…"] } }
```

### 4.5 Caching and the locale — FE integration guide

> **Read this before wiring any localized endpoint.** The same URL now returns
> different bytes depending on request headers. Getting this wrong does not
> fail loudly — it shows Vietnamese text to English users (and vice versa) for
> as long as the cache entry lives. This is the single highest-risk part of
> Epic 6.

#### 4.5.1 What the server guarantees

Every localized response carries:

```http
Content-Language: en
Vary: X-Locale, Accept-Language, Authorization
```

- **`Content-Language`** is the locale that was actually resolved after the
  full §2.2.1 chain. If you asked for `en` and get back `vi`, the code had no
  English translation and fell back — that is your signal to show a "not yet
  translated" marker (§3.8).
- **`Vary`** lists every request header the body depends on. `Authorization`
  is in the list because the public endpoints accept an *optional* bearer
  token: a signed-in user with `users.locale = en` and an anonymous visitor
  hitting the identical URL get different bodies.

`Content-Language` is a CORS-safelisted response header, so `res.headers.get('content-language')`
works cross-origin with no extra server config.

#### 4.5.2 Rule 1 — put the locale in the URL for public GETs

**Use `?locale=` on cacheable public reads. Do not rely on `X-Locale` alone.**

A query parameter is part of the cache key in *every* browser, CDN and proxy,
unconditionally. `Vary` is only honoured by caches that implement it correctly,
and a surprising number of CDN configurations either ignore it or are set up to
strip request headers before the cache lookup. `?locale=` removes the risk
entirely instead of depending on infrastructure you may not control.

```ts
// ✅ cacheable public reads — locale in the URL
api.get(`/master-data/codes?groupKey=course_level&locale=${locale}`);
api.get(`/courses?locale=${locale}&page=1`);
api.get(`/courses/${slug}?locale=${locale}`);

// ✅ authenticated / non-cacheable calls — header is fine
api.patch('/admin/master-data/groups/course_level/codes/x', body); // X-Locale
```

Both mechanisms resolve identically on the server (`?locale=` simply wins over
`X-Locale`), so this costs nothing and is purely defensive.

#### 4.5.3 Rule 2 — keep sending `X-Locale` everywhere anyway

Set `X-Locale: <currentLocale>` in the global request interceptor for **all**
calls, including the ones that already carry `?locale=`. It covers every
endpoint you have not special-cased, and it stops the server doing a per-request
`users.locale` lookup on authenticated calls.

Never send an `X-Locale` that disagrees with the `?locale=` on the same
request — the query parameter wins, and the mismatch will make cache debugging
miserable.

#### 4.5.4 Rule 3 — locale belongs in every client cache key

React Query / SWR / Apollo cache on the key you give them, and they know
nothing about `Vary`. A key without the locale will serve the previous
language after a switch.

```ts
// ❌ switching language reuses the old response
useQuery({ queryKey: ['master-data', groupKey], queryFn: … });

// ✅
useQuery({ queryKey: ['master-data', groupKey, locale], queryFn: … });
```

On switch, update the locale in state and let the changed keys drive refetches;
if you keep locale outside the key for some reason, you must invalidate
explicitly:

```ts
await queryClient.invalidateQueries({ predicate: (q) => q.queryKey.includes('master-data') });
```

#### 4.5.5 Rule 4 — never persist a localized response as if it were neutral

If you cache API payloads in `localStorage`, `IndexedDB` or a service worker,
store them **under a locale-scoped key**. A cached `master-data:course_level`
blob written while the user was in English will be read back after they switch
to Vietnamese.

For service workers using the Cache API, `cache.match()` respects `Vary` by
default — **do not pass `ignoreVary: true`**, which is a common copy-paste that
silently breaks this.

#### 4.5.6 Checklist before the develop deploy

| # | Check | Owner |
|---|---|---|
| 1 | CDN / reverse proxy in front of the API honours `Vary`, **or** all public GETs carry `?locale=` | BE + FE |
| 2 | The proxy does not strip `X-Locale` or `Accept-Language` before the cache lookup | Infra |
| 3 | `Authorization` is not stripped, and authenticated responses are not stored in a shared cache | Infra |
| 4 | Every localized query key includes the locale | FE |
| 5 | Language switch triggers a refetch of all master-data-backed queries | FE |
| 6 | No `ignoreVary: true` anywhere in the service worker | FE |

#### 4.5.7 How to tell it is broken

Cache poisoning looks like *"the site is randomly in the wrong language"* and
usually only reproduces for a second visitor, which makes it hard to chase.
Confirm it in one command — same URL, two locales, compare the bodies and the
echoed `Content-Language`:

```bash
curl -sD - 'https://<host>/api/v1/master-data/codes?groupKey=course_level&locale=vi' -o /dev/null | grep -i 'content-language\|vary\|age\|x-cache'
curl -sD - 'https://<host>/api/v1/master-data/codes?groupKey=course_level&locale=en' -o /dev/null | grep -i 'content-language\|vary\|age\|x-cache'
```

If the second response comes back `Content-Language: vi`, or an `Age` /
`X-Cache: HIT` header appears on a locale you have not requested before, the
cache in front of the API is not keying on the locale. Switch that endpoint to
`?locale=` and purge.

### 4.6 Other notes for FE

- `code` and `groupKey` are stable identifiers and are never translated — key
  off those, never off `name`.
- A row whose `nameTranslations` has no `en` key is the "missing translation"
  state for the ⚠️ badge; the API still returns a usable Vietnamese `name`.
- On the admin editor, bind the inputs to `nameTranslations` / `descriptionTranslations`,
  **not** to `name` — `name` is rendered in the admin's own locale and would
  round-trip the wrong value.
- Search and autocomplete over master data should match against every value in
  `nameTranslations`, not just the rendered `name` (§3.2).

## 5. Acceptance Criteria (Epic-level)

Written in BDD style, matching the requirement PDF format.

**AC-1 — Storage & default locale**
- **Given** the admin creates a new master data code
  **When** the admin submits a form missing the Vietnamese name
  **Then** the system rejects the submission with a validation error and does not create the row.
- **Given** an existing master data code has `name_translations.en` empty
  **When** any consumer requests it with `?locale=en`
  **Then** the response returns the Vietnamese value and `resolved_locale: "vi"`.

**AC-2 — Admin editor**
- **Given** the admin opens `ADM_MAS_13`
  **When** the page loads
  **Then** the system displays each entry with columns for Vietnamese and English names, and marks rows missing an English translation.
- **Given** the admin submits a valid VI + EN translation
  **When** the record is saved
  **Then** the system updates `name_translations` and reflects the change wherever the code is rendered.
- **Given** the admin filters by "Missing EN"
  **When** the filter is applied
  **Then** the system displays only rows whose `name_translations` does not contain an `en` key.

**AC-3 — Language switcher**
- **Given** a supported locale list is available
  **When** any user opens the header switcher
  **Then** the system displays every supported locale with its native name.
- **Given** an authenticated user selects a new locale
  **When** the selection is confirmed
  **Then** the system updates the UI in place, persists `users.locale`, and reuses that locale in the next session.
- **Given** a guest user selects a locale
  **When** the selection is confirmed
  **Then** the system remembers the choice via `localStorage` for future visits from the same browser.

**AC-4 — Rendering**
- **Given** a student browses the course catalog with locale `en`
  **When** cards are rendered
  **Then** each level / category / group label appears in English when available, otherwise in Vietnamese.
- **Given** a student views a course overview with locale `en`
  **When** instructor expertise chips are displayed
  **Then** each chip label uses the English name from `master_data_code.name_translations.en`.

**AC-5 — Consistency & fallback**
- **Given** a client requests any localized endpoint
  **When** the response is returned
  **Then** it includes `resolved_locale` and `fallback_locale` so the client can detect fallback silently.
- **Given** the request supplies an unsupported locale
  **When** the server resolves the locale
  **Then** it falls back to `vi` and the response reports `resolved_locale: "vi"`.

**AC-6 — Data integrity**
- **Given** any write to `master_data_group` or `master_data_code`
  **When** the payload does not contain `name_translations.vi`
  **Then** the DB CHECK constraint prevents the write and the API returns a validation error.

---

## 6. Out of Scope (V1)

- Locale-prefixed URLs (`/en/courses`, `/vi/courses`) and locale-aware canonical / hreflang SEO tags.
- Localizing user-generated content (course reviews, reflections, custom career interest text, instructor bio).
- Localizing **course fields** (`title`, `short_description`, `full_description`, `learning_outcomes`, `requirements`, `target_learners`) — plan a separate epic that applies the same JSONB pattern to `courses`, `sections`, `lectures`.
- Localizing **assessment content** (`assessment_questions.question_text`, `assessment_question_options.option_text`, `assessment_sections.name`) — separate epic, same JSONB pattern.
- Localizing **RBAC labels** (`modules.label`, `permissions.label`) — trivial add-on when needed; not urgent for V1 since Admin UI copy comes from FE i18n resources.
- Machine-translation auto-fill in the admin editor (button "Translate with AI"). Nice-to-have V2.
- Right-to-left languages and non-Latin scripts beyond CJK; V1 targets VI + EN only.
- Rich-text descriptions in `description_translations` (plain text only in V1).
