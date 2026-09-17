# Epic 4.5 — Career Reflection Rework (Certificate Screen `STU_CER_10`)

> **Change trigger:** the career reflection block on the certificate screen moves from the old 6-question Likert design (slider / radio / select, 6 categories) to a **new 5-question set: 2 free text + 3 single-select with custom Vietnamese options**. This file is the BE + FE change plan. It **supersedes** the career-reflection parts of `epic-4-1.md` §A1 (answer encoding, slider/radio/select types, label_min/max) and **updates** the reflection dashboard charts in `EPIC-07` (§E/F).

---

## 1. Locked requirement — the new question set

| # | Type | Question (vi, verbatim) | Options |
|---|---|---|---|
| Q1 | free_text | Mục đích ban đầu bạn tham gia khóa học này là gì? | — |
| Q2 | selection | Bạn đạt được gì sau khi hoàn thành khóa học | 1 — Hiểu rõ nội dung khóa học, qua đó giúp tôi khám phá ra được tôi "có thể" hợp với ngành/nghề này, tuy nhiên vẫn cần khám phá thêm · 2 — Hiểu rõ nội dung khóa học, qua đó giúp tôi khám phá ra được tôi KHÔNG phù hợp với ngành nghề này · 3 — Chưa hiểu rõ nội dung khóa học lắm / Chưa xác định được rằng liệu tôi CÓ/KHÔNG phù hợp với ngành nghề này |
| Q3 | selection | Dự định tiếp theo của bạn là gì? | 1 — Tiếp tục tìm hiểu các ngành khác để tìm ra được ngành nghề phù hợp · 2 — Tìm kiếm mentor dạy / chia sẻ kiến thức chuyên sâu về ngành/nghề này, để tiếp tục nâng cao kiến thức |
| Q4 | free_text | Feedback về chất lượng khóa học mà bạn muốn chúng tôi cải thiện | — |
| Q5 | selection | Bạn có dự định chia sẻ nền tảng học tập hướng nghiệp này cho bạn bè/người quen? | 1 — Chắc chắn · 2 — Không phải lúc này |

All 5 questions are **required**. Selections are **single-select** (radio). Free-text is **plain text** (no rich formatting). Question text + option labels must support **vi (default) + en** (EPIC 6 i18n).

**Default placement:** with `course_id = NULL` (global) — applies to every course's certificate screen. Admin may create course-specific overrides later (existing `course_id` column already supports it).

---

## 2. Data model changes (BE)

### 2.1 Replace `question_type` enum
The v2.1 column was locked to `slider|radio|select`. Replace for the new set:

```sql
ALTER TABLE career_reflection_questions
  DROP CONSTRAINT IF EXISTS chk_career_reflection_q_type,
  ADD  CONSTRAINT chk_career_reflection_q_type
       CHECK (question_type IN ('free_text','selection'));
-- ALTER type column swing: 'free_text' | 'selection'
```

### 2.2 New columns

```sql
ALTER TABLE career_reflection_questions
  ADD COLUMN options                jsonb,           -- [{"key":1,"label":"vi text"}, ...] ; NULL for free_text
  ADD COLUMN options_translations   jsonb,           -- {"en":[{"key":1,"label":"en text"},...]}
  ADD COLUMN question_text_translations jsonb,       -- {"en":"..."}
  ADD COLUMN is_required            boolean NOT NULL DEFAULT true,
  DROP COLUMN IF EXISTS label_min,                   -- no longer used (no slider)
  DROP COLUMN IF EXISTS label_max;

-- answers: enforce one row per (enrollment, question) for upsert semantics
ALTER TABLE career_reflection_answers
  ADD CONSTRAINT uq_career_reflection_answers UNIQUE (enrollment_id, question_id);
```

**Answer encoding (supersedes epic-4-1 §A1):**
| question_type | column used | value |
|---|---|---|
| selection | `rating_answer` smallint | option `key` (1-based as defined in `options`) — **not** an index; server validates key ∈ options keys |
| free_text | `text_answer` text | trimmed, **min 10 chars** (env `CAREER_REFLECTION_MIN_CHARS`, default `10`) |

`rating_answer`/`text_answer` remain nullable — exactly one is set per answer depending on type.

### 2.3 Seed data (global questions, display_order 1–5)
`INSERT` the 5 questions from §1 with `course_id = NULL`, `is_active = true`, `display_order` 1..5, `options` + `options_translations.en` populated. English translations:
- Q1 en: "What was your initial purpose for joining this course?"
- Q2 en: "What did you gain after completing the course?" options: "I understood the course content and discovered that I *could* fit this career path, but need to explore more" / "I understood the content and discovered I am NOT suited to this career path" / "I did not fully understand the content / cannot yet determine whether I fit this career"
- Q3 en: "What is your next intention?" "Continue exploring other careers to find the right fit" / "Find a mentor for deeper knowledge of this career"
- Q4 en: "What course-quality feedback would you like us to improve?"
- Q5 en: "Do you intend to share this career-guidance platform with friends/acquaintances?" "Definitely" / "Not at this time"

No FK migration needed; `career_reflection_answers` already has `enrollment_id`, `question_id`, `rating_answer`, `text_answer`.

---

## 3. BE work

| ID | Task | Detail |
|---|---|---|
| BE-1 | Migration (2.1 + 2.2) | enum swap, new columns, unique constraint |
| BE-2 | Seed data (2.3) | global 5 questions, vi + en |
| BE-3 | `GET /career-reflection-questions?courseId=` — **MODIFY** response | flat list ordered by `display_order`; per question: `{ id, questionType, questionText, questionTextTranslations, options: [{key,label,labelTranslations}] , isRequired }`. `category` grouping **removed** (category column stays unused in DB). Localized text CAN be included per `X-Locale` (EPIC 6) instead of raw translations — pick one contract (recommend sending `questionText`/`label` already localized server-side). |
| BE-4 | `POST /enrollments/:id/career-reflection` — **MODIFY** validations | accept `{ answers: [{ questionId, ratingAnswer?, textAnswer? }] }`. Server rules: every `is_required` question answered; selection → `ratingAnswer` must be a key in `options` (422 `invalidOptionKey`); free_text → trimmed `textAnswer.length >= CAREER_REFLECTION_MIN_CHARS` (422 `textTooShort`); unknown questionId → 422. **Upsert** on `(enrollment_id, question_id)` — re-submit updates existing answer (`updated_at = NOW()`). Return `{ savedCount, answers }`. |
| BE-5 | `GET /enrollments/:id/career-reflection` — **MODIFY** | return `{ questions: [...], answers: [{ questionId, ratingAnswer?, textAnswer?, updatedAt }] }` so FE can prefill on revisit. |
| BE-6 | Admin management — **ADD** (admin-only, `courses:edit`) | `POST/PATCH/DELETE /admin/career-reflection-questions` for CRUD incl. translations + `isRequired` + `isActive` + `displayOrder`. Powers the question editor in `ADM_CUR_15` (new "Career reflection" tab) for global + course-specific rows. |
| BE-7 | Env | `CAREER_REFLECTION_MIN_CHARS=10` (validated at boot). |
| BE-8 | Reflection dashboard (EPIC 07) — **MODIFY** | per §6 below. |
| BE-9 | Unit tests | validation matrix (missing required, bad option key, short text), upsert idempotency, translations fallback (vi default). |

**Effort: 2–3 days.**

---

## 4. FE work

| ID | Task | Detail |
|---|---|---|
| FE-1 | `<CareerReflectionForm />` — **REWRITE** (shared by certificate screen) | remove hardcoded 6-question layout; render from `GET /career-reflection-questions?courseId=`; router by `questionType`: `free_text` → `<Textarea ref>` (label, required `*`, helper "Tối thiểu 10 ký tự"); `selection` → radio group, **full option label rendered** (options are long sentences — allow wrap, no truncation), one option selected max. |
| FE-2 | Store rework | replace the fixed form state with `{ [questionId]: { ratingAnswer? | textAnswer? } }` built from the fetched question list; dirty tracking per question. |
| FE-3 | Validation (mirror BE) | all required answered; free text ≥ 10 chars trimmed; `<Save Reflection>` disabled until valid; inline error under each question; counter under textareas (`12 / 10`). |
| FE-4 | Submit | `POST /enrollments/:id/career-reflection` → success toast "Reflection saved"; re-visit prefill from `GET .../career-reflection`; if answers exist → submit button label "Update Reflection" (upsert allowed, BE-4). |
| FE-5 | i18n | question text + options rendered from `X-Locale` localized payload (EPIC 6). Vietnamese default — the design's current data is vi; en shown only when locale=en. |
| FE-6 | Loading / error / empty | skeleton while questions load; error + retry; if question list empty → hide the whole Career Reflection card (no dead form). |
| FE-7 | Design alignment | keep the existing "Career Reflection" card style (section header with psychology icon, divider) — only the question bodies change. Remove the old slider/select markup. |

**Effort: 2–3 days.**

---

## 5. API integration

> **Status: shipped on the server, 15/09/2026** (BE-1 … BE-9). Every payload below was captured
> from a running instance. FE-1 … FE-7 are not started. Where this section and §2–§3 disagree,
> **this section is what the server does** — §5.9 lists each deviation and why.

### 5.1 Endpoints

| Surface | Method | Path | Auth | State |
|---|---|---|---|---|
| Load questions | `GET` | `/api/v1/career-reflection-questions/grouped?courseId=` | public | 🔧 **BREAKING** — flat list, see §5.2 |
| Prefill on revisit | `GET` | `/api/v1/enrollments/:id/career-reflection` | JWT + owner | 🔧 **BREAKING** — `{ questions, answers, rules }` |
| Save / update | `POST` | `/api/v1/enrollments/:id/career-reflection` | JWT + owner | 🔧 **BREAKING** — validation + upsert |
| Admin list | `GET` | `/api/v1/admin/career-reflection-questions?courseId=&isActive=` | `courses:view` | 🔧 new shape |
| Admin create | `POST` | `/api/v1/admin/career-reflection-questions` | `courses:create` | 🔧 new shape |
| Admin update | `PATCH` | `/api/v1/admin/career-reflection-questions/:id` | `courses:edit` | 🔧 new shape, 409 guards |
| Admin deactivate | `PATCH` | `/api/v1/admin/career-reflection-questions/:id/deactivate` | `courses:edit` | unchanged |
| Admin delete | `DELETE` | `/api/v1/admin/career-reflection-questions/:id` | `courses:delete` | ✅ **NEW** |
| Dashboard zone E | `GET` | `/api/v1/admin/dashboard/reflection` | `dashboard:view` | 🔧 **BREAKING** — §5.7 |
| Dashboard zone F | `GET` | `/api/v1/admin/dashboard/reflection/comments?questionId=` | `dashboard:view` | 🔧 + `questionId` filter |
| Certificate screen | `GET` | `/api/v1/enrollments/:id/certificate` | JWT + owner | unchanged |

**Use the path with `/grouped`.** The bare `GET /career-reflection-questions` is the generated
admin CRUD and returns 403 to students. The name is historical; the body is no longer grouped.

**The certificate screen needs only one call.** `GET /enrollments/:id/career-reflection` already
returns the questions, so the form does not need to call `/grouped` separately.

### 5.2 `GET /career-reflection-questions/grouped?courseId=`

```jsonc
{
  "questions": [
    {
      "id": "4e6a0001-0000-4000-8000-000000000001",
      "questionType": "free_text",
      "questionText": "Mục đích ban đầu bạn tham gia khóa học này là gì?",
      "isRequired": true,
      "displayOrder": 1,
      "options": null
    },
    {
      "id": "4e6a0001-0000-4000-8000-000000000005",
      "questionType": "selection",
      "questionText": "Bạn có dự định chia sẻ nền tảng học tập hướng nghiệp này cho bạn bè/người quen?",
      "isRequired": true,
      "displayOrder": 5,
      "options": [
        { "key": 1, "label": "Chắc chắn" },
        { "key": 2, "label": "Không phải lúc này" }
      ]
    }
    // … Q2, Q3, Q4
  ],
  "rules": { "minTextLength": 10 }
}
```

- **Already ordered** — render in array order. Global questions come before a course-specific one
  sharing the same `displayOrder`.
- **Already localized.** `questionText` and `label` are in the request's language; no translation
  maps are sent. Locale precedence: `?locale=` → `X-Locale` header → the signed-in user's saved
  locale → `Accept-Language` → `vi`. A missing translation falls back to Vietnamese per string.
- **`options` is `null` for `free_text`**, an array for `selection`. Render labels in full — they
  are sentences and must wrap, never truncate.
- **`rules.minTextLength` is the server's value** (env `CAREER_REFLECTION_MIN_CHARS`). Use it for the
  `12 / 10` counter and the helper text instead of hardcoding 10.
- **Empty `questions`** → hide the whole Career Reflection card (FE-6).
- The five seeded questions have **fixed ids** (`…000000000001` to `…000000000005` for Q1–Q5).
  They are stable across environments, but do not hardcode them in the form — render what arrives.

### 5.3 `GET /enrollments/:id/career-reflection`

```jsonc
{
  "questions": [ /* exactly as §5.2 */ ],
  "answers": [
    {
      "questionId": "4e6a0001-0000-4000-8000-000000000001",
      "ratingAnswer": null,
      "textAnswer": "Muốn thử sức với ngành tài chính",
      "submittedAt": "2026-09-15T12:45:01.333Z",
      "updatedAt": "2026-09-15T12:45:02.480Z"
    },
    {
      "questionId": "4e6a0001-0000-4000-8000-000000000003",
      "ratingAnswer": 2,
      "textAnswer": null,
      "submittedAt": "2026-09-15T12:45:01.333Z",
      "updatedAt": "2026-09-15T12:45:02.480Z"
    }
  ],
  "rules": { "minTextLength": 10 }
}
```

- `answers` contains answers to **questions currently on the form** only. Answers to retired
  questions (including all of Epic 4.1's Likert form) are never pre-filled.
- `answers: []` → first visit: button reads **Save Reflection**. Non-empty → **Update Reflection**.
- `submittedAt` is the **first** submission and never changes; `updatedAt` is the latest edit.
- `404 enrollmentNotFound`, `403 notYourEnrollment`.

### 5.4 `POST /enrollments/:id/career-reflection`

**Request** — send one entry per answered question, with exactly one value field:

```jsonc
{
  "answers": [
    { "questionId": "4e6a0001-…-000000000001", "textAnswer": "Muốn thử sức với ngành tài chính" },
    { "questionId": "4e6a0001-…-000000000002", "ratingAnswer": 1 },
    { "questionId": "4e6a0001-…-000000000003", "ratingAnswer": 2 },
    { "questionId": "4e6a0001-…-000000000004", "textAnswer": "Nên thêm bài tập thực hành" },
    { "questionId": "4e6a0001-…-000000000005", "ratingAnswer": 1 }
  ]
}
```

| Question type | Send | Must be |
|---|---|---|
| `selection` | `ratingAnswer` | the option's **`key`** — never the array index |
| `free_text` | `textAnswer` | ≤ 5000 chars; ≥ `rules.minTextLength` after trim |

Always send the **whole form**. It is validated as a whole: a required question missing from the
payload is reported as `required`.

**200**

```jsonc
{ "savedCount": 5, "answers": [ /* same shape as §5.3 answers */ ] }
```

Re-submitting is an **upsert**: one row per question, updated in place (D4). Show the "Reflection
saved" toast and switch the button to Update Reflection.

**422 — every problem at once, keyed by question id.** Put each code under its question:

```jsonc
{
  "status": 422,
  "errors": {
    "answers": {
      "4e6a0001-…-000000000001": "textTooShort",
      "4e6a0001-…-000000000002": "invalidOptionKey",
      "4e6a0001-…-000000000003": "answerTypeMismatch",
      "4e6a0001-…-000000000005": "required"
    }
  }
}
```

| Code | Meaning | Suggested copy (vi) |
|---|---|---|
| `required` | A required question was not answered (missing, blank text, or null key). | Vui lòng trả lời câu hỏi này |
| `textTooShort` | Trimmed text shorter than `rules.minTextLength`. | Tối thiểu {minTextLength} ký tự |
| `invalidOptionKey` | `ratingAnswer` is not one of this question's keys. | Lựa chọn không hợp lệ |
| `answerTypeMismatch` | `textAnswer` sent to a selection, or `ratingAnswer` to free text. | *(client bug — log it)* |
| `unknownQuestion` | Not on this course's form — usually deactivated while the form was open. | Câu hỏi đã thay đổi, vui lòng tải lại |
| `duplicateQuestion` | The same `questionId` appeared twice. | *(client bug — log it)* |

**Nothing is written when any answer fails** — the form is all-or-nothing.

A body-level problem (not an array, `questionId` not a uuid, more than 50 entries) returns the
standard DTO 422 shape instead, without `errors.answers`.

**Mirroring the rules on the client (FE-3).** Measure after `value.normalize('NFC').trim()` —
that is what the server counts. Some Vietnamese input methods produce decomposed characters
("ệ" as three code points), which would otherwise count longer on the client than on the server.

### 5.5 Admin question management (BE-6)

**Question shape** (create body, and every admin response):

```jsonc
{
  "id": "4e6a0001-0000-4000-8000-000000000005",
  "questionType": "selection",                       // "free_text" | "selection" — required on create
  "questionText": "Bạn có dự định chia sẻ nền tảng học tập hướng nghiệp này cho bạn bè/người quen?",
  "questionTextTranslations": { "en": "Do you intend to share this career-guidance platform with friends/acquaintances?" },
  "options": [                                       // selection: 2–7; free_text: null/omitted
    { "key": 1, "label": "Chắc chắn",          "labelTranslations": { "en": "Definitely" } },
    { "key": 2, "label": "Không phải lúc này", "labelTranslations": { "en": "Not at this time" } }
  ],
  "isRequired": true,                                // default true
  "isActive": true,                                  // required on create
  "displayOrder": 5,                                 // required on create
  "category": null,                                  // D6 — kept, unused
  "course": null                                     // null/omitted = global; { "id": "<courseId>" } = course-specific
}
```

- `label` (vi) ≤ 500 characters. Translation maps take locale codes (`en`); a blank value is
  treated as missing and falls back to Vietnamese.
- **Array order is display order; `key` is identity.** The editor may reorder freely. When adding
  an option, give it a key that has never been used on that question.

**Editing rules — answers already given are never stranded:**

| Edit | Unanswered question | Answered question |
|---|---|---|
| Change text, translations, `isRequired`, `displayOrder` | ✅ | ✅ |
| Relabel or reorder options (keys unchanged) | ✅ | ✅ |
| Add an option | ✅ | ✅ |
| Remove an option key | ✅ | **409** `{ "options": "optionKeyInUse:2" }` if someone chose that key |
| Change `questionType` | ✅ | **409** `{ "questionType": "questionHasAnswers" }` |
| `DELETE` | **204** | **409** `{ "id": "questionHasAnswers" }` — deactivate instead |
| Deactivate | ✅ | ✅ answers are kept |

⚠️ **`options` in a PATCH replaces the whole array.** Send every option with its
`labelTranslations`, or the translations are dropped.

**Validation errors (422)**: `questionType: unsupported` (incl. the retired `slider`/`radio`/`select`),
`options: requiredForType | notAllowedForType | outOfRange | duplicateKey | keyMustBePositiveInteger | labelRequired`,
`course: notExists`. `404 questionNotFound` for an unknown id.

**Do not create active *global* questions casually.** Every active global question is added to
every course's certificate form, and `isRequired` defaults to `true` — so a test question saved as
active immediately blocks every student's submission until it is answered. Create as
`isActive: false`, fill in translations, then activate.

### 5.6 Migration effects the FE should know

- **All pre-existing questions are deactivated** — Epic 4.1's six Likert questions and anything an
  admin authored. Their answers are kept. Sliders became `selection` with keys 1–5; radio/select
  became `selection` with `value` renamed to `key`.
- The admin editor will list those inactive rows under `isActive=false`. They are safe to leave.

### 5.7 Dashboard zone E — `GET /admin/dashboard/reflection` (replaces the radar)

Same query params and envelope as every EPIC-07 endpoint. `data`:

```jsonc
{
  "selections": [
    {
      "questionId": "4e6a0001-0000-4000-8000-000000000005",
      "questionText": "Bạn có dự định chia sẻ nền tảng học tập hướng nghiệp này cho bạn bè/người quen?",
      "displayOrder": 5,
      "courseId": null,
      "answered": 1,
      "responseShare": 100,
      "options": [
        { "key": 1, "label": "Chắc chắn",          "count": 1, "pct": 100 },
        { "key": 2, "label": "Không phải lúc này", "count": 0, "pct": 0 }
      ]
    }
    // Q2 (E1), Q3 (E2), Q5 (E3) — one entry per active selection question
  ],
  "freeText": [
    { "questionId": "4e6a0001-…-000000000001", "questionText": "Mục đích ban đầu bạn tham gia khóa học này là gì?", "displayOrder": 1, "courseId": null, "answered": 1 },
    { "questionId": "4e6a0001-…-000000000004", "questionText": "Feedback về chất lượng khóa học mà bạn muốn chúng tôi cải thiện", "displayOrder": 4, "courseId": null, "answered": 1 }
  ],
  "totalResponses": 1,
  "totalAnswers": 5,
  "responseRate": { "rate": 100, "responded": 1, "completed": 1 }
}
```

- **One horizontal bar chart per entry in `selections`**, in array order. Driven by the data, not
  hardcoded to Q2/Q3/Q5 — an admin-added selection question appears automatically.
- `options` lists **every** declared option, zeros included, in the admin's display order.
- `pct` = share of **that question's** answers. `responseShare` = `answered ÷ totalResponses` —
  §6's "Q2 response share %", available for every question.
- `pct` and `responseShare` are **`null`** when there is nothing to divide by. Render "No data",
  not 0% (EPIC-07 §1.3).
- Scope: active global questions, plus course-specific ones when `courseId`/`groupId` covers their
  course. Inactive questions never appear.
- **Removed:** `categories`. There is no radar data any more.

### 5.8 Dashboard zone F — `GET /admin/dashboard/reflection/comments`

New optional param **`questionId`** — use the ids from `data.freeText` for the filter chips.

```jsonc
{
  "items": [
    {
      "answerId": "dd087162-d9f9-4d80-b9b5-a5a1c56e64c7",
      "text": "Muốn thử sức với ngành tài chính",
      "questionId": "4e6a0001-0000-4000-8000-000000000001",
      "questionText": "Mục đích ban đầu bạn tham gia khóa học này là gì?",
      "questionOrder": 1,
      "courseTitle": "MIT 18.642 — Topics in Mathematics with Applications in Finance",
      "submittedAt": "2026-09-15T12:45:01.333Z"
    }
  ],
  "total": 2, "page": 1, "limit": 1
}
```

`questionOrder` is the question's `displayOrder` — render the tag as `Q{questionOrder}`.
Exports: `dataset=reflection` is now one row per option per question; `dataset=reflection-comments`
gains a Question column.

### 5.9 Where the server differs from §2–§3, and why

| Spec said | Server does | Why |
|---|---|---|
| `GET /career-reflection-questions?courseId=` | `…/grouped?courseId=` | The bare path is the admin CRUD (403 for students); Epic 4.1 already moved the FE off it. |
| Separate `options_translations` column | `labelTranslations` on each option | One array cannot drift from a second one; matches the Epic 6 convention already in the table. |
| Flat array response | `{ questions, rules }` | Carries `minTextLength` so FE and BE enforce one number (D3). |
| Admin CRUD all under `courses:edit` | create `courses:create`, delete `courses:delete`, update/deactivate `courses:edit` | Keeps the existing RBAC split; delete is the destructive action. |
| `DELETE` removes the question | Hard delete only when unanswered, else 409 | Deleting an answered question would erase students' responses. |
| First 422 only | All problems at once, keyed by question id | Lets FE-3 show inline errors under every question in one pass. |
| — | `submittedAt` = first submission | The dashboard windows responses by it; an edit a month later must not move a response into this month. |

---

## 6. Cross-impact — reflection dashboard (EPIC 07 §E/F must change)

The old radar chart was built on 6 rating categories (`interest/understanding/confidence/skill_fit/advanced_intention/overall_usefulness`). Those categories no longer receive answers. Replace §E/F:

| Old chart | New chart (EPIC 4.5) |
|---|---|
| E · Radar (6 categories, avg 1–5) | **E1** · Q2 outcome distribution — horizontal bar of 3 options ("Fits / Not fits / Undecided"); **E2** · Q3 next-intention bar (2 options); **E3** · Q5 share-intent bar (2 options). Keep mini-KPIs: total responses, response rate (answered / completed), plus **Q2 response share %**. |
| F · Written responses list | Keep — now covers Q1 (purpose) + Q4 (quality feedback) free text, each item shows comment, question tag (Q1/Q4), course title, submission date; filterable by question. |

`/admin/dashboard/reflection` aggregate endpoint response changes accordingly (per-question option distribution instead of per-category average). Flagged here so the dashboard epic is updated in the same release.

---

## 7. Assumptions / decisions locked

| # | Decision | Value |
|---|---|---|
| D1 | Question placement | global `course_id = NULL`, overridable per course later |
| D2 | Selection cardinality | single-select (radio); `rating_answer` = option key |
| D3 | Free-text minimum | 10 chars trimmed (env) — same rule both FE and BE |
| D4 | Re-submission | allowed; upsert on `(enrollment_id, question_id)`; no attempt versioning |
| D5 | i18n | server localizes text+options by `X-Locale`; fallback vi |
| D6 | `category` column | retained but unused; radar dashboard replaced per §6 |
| D7 | Admin UI | new "Career reflection" tab in `ADM_CUR_15` (global + per-course rows, translations editor) |

---

## 8. Definition of done

- [ ] Migration + seed applied; enum `free_text|selection`; unique `(enrollment_id, question_id)`
- [ ] `GET`/`POST` career-reflection contract per §3/§5 (validated, upsert, localized)
- [ ] Admin CRUD live behind `courses:edit`; editor tab in `ADM_CUR_15`
- [ ] `<CareerReflectionForm />` renders the 5 questions by type; validations mirror BE; prefill + "Update Reflection" on revisit
- [ ] Certificate screen Career Reflection card works end-to-end; empty question list hides the card
- [ ] EPIC 07 reflection dashboard charts updated per §6 (no stale radar)
- [ ] BE-9 unit tests green; AC walk on a completed enrollment

---

*End of Epic 4.5.*
