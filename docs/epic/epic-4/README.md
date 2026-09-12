# Epic 4 — Course Discovery, Enrollment, Learning & Completion

Everything about the student's journey through a course lives in this folder: browsing the
catalog, enrolling, learning, finishing, and getting the certificate. Ten files, one epic.

| File | What it is | Status |
|---|---|---|
| [`epic_4_course_journey_v2.md`](./epic_4_course_journey_v2.md) | **The source of truth.** Catalog, overview, enrolment, the four player screens, progress, quiz, reflection, completion. §4 is the API contract, reconciled against the shipped code at v2.3. | Shipped (BE) |
| [`epic_4_1.md`](./epic_4_1.md) | The completion & certificate screen (`STU_CER_10`), which v2.3 left out of scope. Plus the public verify page and the admin question editor. | In build |
| [`epic_4_2_journey_fixes.md`](./epic_4_2_journey_fixes.md) | The corrective pass after the first live run: nine defects, one P0 that revokes a student's certificate, plus the data and test-process problems that let them ship green. | Shipped (BE) — §1a has the per-defect status |
| [`epic_4_2_fe_plan.md`](./epic_4_2_fe_plan.md) | The client half of that pass: what the shipped server changes actually oblige the FE to touch, and — recorded on purpose — what they do not. | Planned |
| [`epic_4_3.md`](./epic_4_3.md) | **Curriculum access & completion state** — the requirement: who may open which lecture, and how a finished one is marked, on the overview and in the player. Corrects the guest lock rule v2 §2.2 got wrong. | Planned |
| [`epic_4_3_api.md`](./epic_4_3_api.md) | 4.3's API contract — field semantics, the caller matrix, error shapes. Both disciplines code against this one. | Planned |
| [`epic_4_3_be.md`](./epic_4_3_be.md) | 4.3 server tasks. ~½ day. | Planned |
| [`epic_4_3_fe.md`](./epic_4_3_fe.md) | 4.3 client tasks. ~2½ days, and where the epic actually lives. | Planned |
| [`epic_4_4_catalog.md`](./epic_4_4_catalog.md) | **Course search & catalog** (`STU_CAT_03`) — multi-select filters, Vietnamese full-text search, URL state, header search routing. One file, three parts: contract, server, client. | Server shipped 07/09/2026; client planned |
| [`epic_4_4_api.md`](./epic_4_4_api.md) | 4.4's API contract — plural filters, the four new card fields, and how the search actually ranks. **Read this before wiring the catalog**, especially §4.3 on why you must not send a default `sortBy`. | Shipped (BE) |
| [`epic_4_5_my_learning_dashboard.md`](./epic_4_5_my_learning_dashboard.md) | **My Learning Dashboard** (`STU_MYC_05`) — implementation plan: tab counts that survive pagination, `continueLecture`, momentum stats, certificate modal. Contract, server and client in one file. | Planned |

## Reading order

Start with **v2** for the domain and the contract. Read **4.1** only for the certificate
screen. Read **4.2** before touching `src/learning/` — it changes rules that v2 states, and §5
of it lists exactly which paragraphs of v2 and 4.1 become wrong. Read **4.2 FE** before
touching the client: it is the only file that names client paths, and its §4 is the list of
things that look like they need changing and do not. For **4.3**, start at `epic_4_3.md` for the
rules and `epic_4_3_api.md` for the contract; the `_be` and `_fe` files are task lists written
against them and restate neither.

## Rules for this folder

- **v2 is the contract; 4.1 and 4.2 are amendments to it.** When 4.2 §5 lands in code, fold
  those amendments back into v2 and 4.1 so a reader who opens only v2 is not misled. The
  amendment file keeps the reasoning; the spec keeps the rule.
- **Journey work goes here, not into a new epic number.** The certificate screen and the bug
  pass were both nearly filed as separate epics. They are the same surface, and a reader
  chasing "how does completion work" should not have to know that three numbers exist.
- **One rule, one home.** 4.3 is split by discipline — requirement, contract, server tasks,
  client tasks — and each fact is written once: rules in the requirement, shapes in the
  contract, file:line in the task lists. A task list that restates a rule is how the two
  disciplines end up implementing different ones.
- **No line-number deltas against another file.** `epic_4_1.md` originally patched a sibling
  spec by line number; the sibling was deleted and the patch became unusable. State the end
  contract instead.

## Related, outside this folder

- [`../epic_3_course_creation.md`](../epic_3_course_creation.md) — how the course being consumed
  here is authored.
- [`../epic_2_roles_master_data.md`](../epic_2_roles_master_data.md) — the permission model
  behind every `/admin/**` route, and the master data behind every dropdown.
- [`../EPIC-05-Instructor-Management.md`](../EPIC-05-Instructor-Management.md) — `primaryInstructor`
  and `coInstructors` on the catalog and overview payloads.
- [`../EPIC-06-I18n-Master-Data.md`](../EPIC-06-I18n-Master-Data.md) — locale resolution and the
  `Vary` rules that apply to the public catalog endpoints.
- `../../EPIC-04-implementation-report.html` — the build report for v2.3, including the
  decisions taken on the author's behalf and the security holes closed.
