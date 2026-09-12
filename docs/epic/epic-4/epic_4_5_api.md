# Epic 4.5 — API Integration Contract (My Learning Dashboard)

> **The handshake.** The server makes this true; the client assumes nothing else. Rules and
> rationale live in [`epic_4_5_my_learning_dashboard.md`](./epic_4_5_my_learning_dashboard.md);
> this file is the shapes.
>
> **Status: shipped on the server, 10/09/2026.** Every payload below was captured from a
> running instance, not written by hand — see §7. `GET /students/me/courses` now returns an
> **envelope**, which is a breaking change for `useMyCoursesQuery`.
>
> **Revised 10/09/2026 — the final grade is frozen (§2.6).** It was computed live from quiz
> attempts on every read, so a student who retook a quiz after finishing saw the grade beside
> their certificate change while the certificate stood still. It is now stored on the
> certificate at issue time and never recomputed. `CertificateDto` gains the same two fields.
>
> **Client not yet updated.** The dashboard is broken between these two landings; that is
> expected and is why §5 of the plan puts BE first.

---

## 1. Endpoints

| Purpose | Method | Path | Auth | State |
|---|---|---|---|---|
| Dashboard list | `GET` | `/api/v1/students/me/courses?status=&page=&limit=` | JWT | **MODIFIED** — envelope |
| Momentum tiles | `GET` | `/api/v1/students/me/stats` | JWT | **NEW** |
| Certificate modal | `GET` | `/api/v1/enrollments/:id/certificate` | JWT + ownership | **+ `finalGradePct`, `gradeLabel`** |
| Verify link | `GET` | `/api/v1/certificate-verify/:number` | public, 20/min per IP | unchanged |
| Continue / Start / Review | — | client route `/{locale}/courses/{slug}/learn/{lectureId}` | — | no API |

**No download endpoint exists and none was added.** Epic 4.1 D4 decided against server-side
PDF for V1: `CertificateDto.fileUrl` is always `null` and the Download button calls
`window.print()` against the certificate screen's existing print stylesheet. Render one
button, labelled Download, that prints.

**`stats` is mounted at `students/me`, not under `courses`.** `students/me/courses/stats`
returns 404 — it would read as a property of the course list rather than of the student.

---

## 2. `GET /students/me/courses`

### 2.1 Query parameters

| Param | Type | Default | Notes |
|---|---|---|---|
| `status` | `in_progress` \| `completed` | absent = all | Anything else → **422**. `cancelled` rows are always part of `all` and never match a tab. |
| `page` | int ≥ 1 | `1` | Past the end returns an empty `data`, not an error. |
| `limit` | int 1–24 | `6` | Above 24 → **422**. The dashboard uses 6 (featured + 5). |

The global pipe runs `whitelist: true`, so **an undeclared param is dropped silently and the
request still answers 200**. A typo in a param name looks like a no-op, not an error.

### 2.2 Response — captured from a live instance

```jsonc
{
  "data": [
    {
      "enrollmentId": "809f07e9-8ba8-4110-bf45-0d6b19a3642a",
      "course": {
        "id": "81a7fc3b-444c-41d2-8efd-22c8ad98dffd",
        "title": "Dashboard 1789055764854",
        "slug": "dashboard-1789055764854",
        "thumbnailUrl": "https://example.com/t.png",
        "language": "vi",
        "totalLectures": 2,
        "totalDurationSecs": 1200,
        "courseGroup": {
          "id": "e71f3d8d-8f87-4dab-9e96-d41294a54245",
          "name": "Group 1789055764854"
        }
      },
      "enrollmentDate": "2026-09-10T15:56:09.012Z",
      "progressPct": 50,
      "lastLectureId": "493b9497-fd84-46d9-8875-4e0a77cd367b",
      "lastLectureTitle": "Lecture 1",
      "lastAccessedAt": "2026-09-10T15:56:10.194Z",
      "status": "in_progress",
      "completedAt": null,
      "courseThumbnailUrl": "https://example.com/t.png",
      "hasCertificate": true,
      "certificateId": null,
      "isArchived": false,
      "completedLectureCount": 1,
      "continueLecture": {
        "id": "a4bee243-d0d4-41c6-abab-56bcf2b43ca3",
        "title": "Lecture 2",
        "sectionTitle": "Module 1"
      },
      "remainingDurationSecs": 600,
      "certificate": null
    }
  ],
  "counts": { "all": 1, "inProgress": 1, "completed": 0 },
  "totalCount": 1,
  "page": 1,
  "limit": 6,
  "hasNextPage": false
}
```

A **completed** card differs only in these fields:

```jsonc
{
  "status": "completed",
  "completedAt": "2026-03-01T00:00:00.000Z",
  "progressPct": 100,
  "completedLectureCount": 2,
  "continueLecture": null,
  "remainingDurationSecs": 0,
  "certificateId": "cert-uuid",
  "certificate": {
    "number": "DNA-2026-000118",
    "issuedAt": "2026-03-01T00:00:00.000Z",
    "finalGradePct": 96,
    "gradeLabel": "A+"
  }
}
```

### 2.3 `counts` vs `totalCount` — they answer different questions

| Field | Describes | Drives |
|---|---|---|
| `counts` | the **unfiltered** set, always | the three tab counters |
| `totalCount` | the **filtered** set | pagination ("Showing x–y of N") |

They are equal only when `status` is absent. `counts` is what makes server-side filtering
compatible with tab counters at all: a page narrowed to `in_progress` cannot know how many
`completed` rows exist, so the counters cannot be derived from `data`.

**Delete any client-side tab counting.** Counting `data` gives the size of the current page,
not of the tab.

### 2.4 Ordering — the client does not re-sort

1. `in_progress`, by `lastAccessedAt` desc (never-opened rows last)
2. `enrolled`, by `enrollmentDate` desc
3. `completed`, by `completedAt` desc
4. `cancelled`, by `enrollmentDate` desc
5. tiebreak `enrollmentId` asc

The featured card is **`data[0]`**. The tiebreak is not cosmetic: without it two rows with
equal keys can swap between requests, and a paginated list then repeats or skips a card.

### 2.5 `continueLecture` — one field, two UI slots

It is both the Continue/Start target **and** the "Next: Module 4 · Convolutional Layers" line.
One field, so the two can never disagree.

```
1. lastLecture, if its progress is 'in_progress'   → resume where they stopped
2. else the first lecture not yet 'completed'      → start the next thing
3. else null                                       → everything is done
```

| `continueLecture` | CTA | Target |
|---|---|---|
| non-null, `progressPct > 0` | **Continue** | `continueLecture.id` |
| non-null, `progressPct === 0` | **Start** | `continueLecture.id` |
| `null` | **Review Content** | first lecture in course order |

**`lastLecture*` is a different thing and keeps its own meaning:** the last lecture the student
*opened*, including one they went back to review after finishing it. Revisiting a finished
lecture is free (Epic 4.2 D7), and this field is what remembers it. Use `lastLectureTitle` for
"last accessed", never as the Continue target.

`remainingDurationSecs` sums `durationSecs` over every not-yet-completed lecture; `0` when
`continueLecture` is null.

### 2.6 Grade — frozen onto the certificate at issue

`finalGradePct` is the student's best submitted quiz score **at the moment the certificate was
issued**, stored on `certificate.finalGradePct` and never recomputed.

```
>= 95 A+ | >= 90 A | >= 85 B+ | >= 80 B | >= 75 C+ | >= 70 C | >= 60 D | else F
```

Only the percentage is stored; the letter is derived from it. Storing both is how the two end
up disagreeing.

**Nothing the student does afterwards moves it.** Retaking a quiz, having progress reset, or an
admin re-issuing the certificate all leave the grade exactly as it was. `POST
/enrollments/:id/certificate/regenerate` deliberately does not touch it: that endpoint corrects
*who* a certificate is for — a misspelt name, a retitled course — never *what was earned*.

The same value appears in two places and is read from the same column in both, so they cannot
diverge:

| Where | Field |
|---|---|
| Dashboard card | `data[].certificate.finalGradePct` / `.gradeLabel` |
| Certificate screen | `certificate.finalGradePct` / `.gradeLabel` |

`finalGradePct: null` means *no quiz was submitted before the certificate was issued*.
**Omit the grade row entirely — do not render `0%`.** `gradeLabel` is null exactly when
`finalGradePct` is.

Two consequences worth knowing:

- **It is still the best single quiz, not a course average.** One perfect quiz and four failed
  ones was frozen as `A+`.
- **Certificates issued before 10/09/2026** had their grade backfilled once, from the attempts
  that existed at migration time — the closest available approximation of what it was at issue.

### 2.7 `GET /enrollments/:id/certificate` — the modal

Unchanged by this epic except for the two grade fields, which read the same frozen column the
card does.

```jsonc
{
  "ready": true,
  "course": { "id": "…", "slug": "…", "title": "…", "thumbnailUrl": "…" },
  "progressPct": 100,
  "lastLectureId": "uuid",
  "pathway": { "groupId": "uuid", "name": "Data & AI" },
  "certificate": {
    "id": "uuid",
    "number": "DNA-2026-000118",
    "studentName": "Nguyễn Văn A",
    "courseTitle": "…",
    "completionDate": "2026-09-06T00:00:00.000Z",
    "finalGradePct": 96,          // NEW — frozen, see §2.6
    "gradeLabel": "A+",           // NEW
    "issuerName": "DNA Learning Academy",
    "signatureUrl": null,
    "issuedAt": "2026-09-06T09:00:09.694Z",
    "fileUrl": null
  }
}
```

---

## 3. `GET /students/me/stats`

No parameters. Aggregates over **every** enrollment, not a page.

```jsonc
{ "lecturesCompleted": 1, "totalStudyHours": 0.2, "certificatesCount": 0 }
```

| Field | Meaning |
|---|---|
| `lecturesCompleted` | `lecture_progress` rows with status `completed` |
| `totalStudyHours` | Σ `durationSecs` of completed lectures ÷ 3600, one decimal |
| `certificatesCount` | certificates held by this student |

**`lecturesCompleted`, not `modulesCompleted`.** The design labels the tile "Modules
Completed" while the number is lectures. The API uses the honest name; the label is a
translation string, not a contract.

`totalStudyHours` is deliberately **not** watch time — it is derived from lecture durations so
the same completed lectures always give the same figure. Its trustworthiness therefore depends
on `durationSecs` being entered correctly (D9); until the Epic 4.2 admin fixes ship and the
existing placeholder rows are corrected, label it an estimate.

---

## 4. Errors

| Status | When |
|---|---|
| `401` | no token |
| `422` | `status` outside the enum, `limit` above 24, `page` below 1 |
| `404` | `students/me/courses/stats` — wrong path, see §1 |

Everything else follows the v2.3 §4.15 table.

---

## 5. Client integration rules

1. **Read the envelope.** `data` is the page; the old bare array is gone.
2. **Counters come from `counts`, never from `data.length`.**
3. **Do not re-sort.** The server's order is the design's order, and `data[0]` is the featured
   card.
4. **Key the cache on `status` + `page` + identity**, and invalidate on enroll — enrolling
   changes `counts` and can change page 1.
5. **Continue goes to `continueLecture.id`**, never to `lastLectureId`.
6. **Hide the grade row when `finalGradePct` is null.** Never render `0%` for "no grade".
7. **Never recompute the grade client-side.** It is a stored, frozen value; deriving it from
   quiz attempts would reintroduce exactly the drift this revision removed.
8. **Download prints.** There is no download endpoint to call.

---

## 6. Verification

```bash
# envelope + counters
curl -s -H "Authorization: Bearer $TOKEN" "$API/api/v1/students/me/courses" \
  | jq '{counts, totalCount, page, limit, hasNextPage, rows: (.data | length)}'

# counts survive a filter — this is the property the epic exists for
curl -s -H "Authorization: Bearer $TOKEN" "$API/api/v1/students/me/courses?status=completed" \
  | jq '.counts'
# expect: identical to the unfiltered call

# momentum tiles
curl -s -H "Authorization: Bearer $TOKEN" "$API/api/v1/students/me/stats" | jq
```

---

## 7. What pins this

| Level | Where | Cases |
|---|---|---|
| Unit — envelope, paging, ordering, `continueLecture`, grade, query cost, stats | `src/course-catalog/my-courses-v2.service.spec.ts` | 39 |
| Unit — grade thresholds from both sides of every boundary | `src/course-catalog/grade-label.spec.ts` | 20 |
| E2E — live shapes, validation, 401/422/404 | `test/user/my-learning-dashboard.e2e-spec.ts` | 13 |

AC-16 is asserted directly: a page of six calls each batched loader **exactly once**, so the
batching is verifiable rather than aspirational.

*End of the Epic 4.5 API contract.*
