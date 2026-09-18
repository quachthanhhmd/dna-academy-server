import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * The five global questions of Epic 4.6 §1, with fixed ids.
 *
 * Fixed rather than generated so the insert is idempotent (`ON CONFLICT`) and
 * so documentation, tests and a future dashboard mapping can name a question
 * without looking it up first.
 */
export const REFLECTION_V2_QUESTION_IDS = {
  purpose: '4e6a0001-0000-4000-8000-000000000001',
  outcome: '4e6a0001-0000-4000-8000-000000000002',
  nextStep: '4e6a0001-0000-4000-8000-000000000003',
  feedback: '4e6a0001-0000-4000-8000-000000000004',
  shareIntent: '4e6a0001-0000-4000-8000-000000000005',
} as const;

type Seed = {
  id: string;
  order: number;
  type: 'free_text' | 'selection';
  vi: string;
  en: string;
  options: { key: number; vi: string; en: string }[] | null;
};

const SEEDS: Seed[] = [
  {
    id: REFLECTION_V2_QUESTION_IDS.purpose,
    order: 1,
    type: 'free_text',
    vi: 'Mục đích ban đầu bạn tham gia khóa học này là gì?',
    en: 'What was your initial purpose for joining this course?',
    options: null,
  },
  {
    id: REFLECTION_V2_QUESTION_IDS.outcome,
    order: 2,
    type: 'selection',
    vi: 'Bạn đạt được gì sau khi hoàn thành khóa học',
    en: 'What did you gain after completing the course?',
    options: [
      {
        key: 1,
        vi: 'Hiểu rõ nội dung khóa học, qua đó giúp tôi khám phá ra được tôi "có thể" hợp với ngành/nghề này, tuy nhiên vẫn cần khám phá thêm',
        en: 'I understood the course content and discovered that I "could" fit this career path, but need to explore more',
      },
      {
        key: 2,
        vi: 'Hiểu rõ nội dung khóa học, qua đó giúp tôi khám phá ra được tôi KHÔNG phù hợp với ngành nghề này',
        en: 'I understood the content and discovered I am NOT suited to this career path',
      },
      {
        key: 3,
        vi: 'Chưa hiểu rõ nội dung khóa học lắm / Chưa xác định được rằng liệu tôi CÓ/KHÔNG phù hợp với ngành nghề này',
        en: 'I did not fully understand the content / cannot yet determine whether I fit this career',
      },
    ],
  },
  {
    id: REFLECTION_V2_QUESTION_IDS.nextStep,
    order: 3,
    type: 'selection',
    vi: 'Dự định tiếp theo của bạn là gì?',
    en: 'What is your next intention?',
    options: [
      {
        key: 1,
        vi: 'Tiếp tục tìm hiểu các ngành khác để tìm ra được ngành nghề phù hợp',
        en: 'Continue exploring other careers to find the right fit',
      },
      {
        key: 2,
        vi: 'Tìm kiếm mentor dạy / chia sẻ kiến thức chuyên sâu về ngành/nghề này, để tiếp tục nâng cao kiến thức',
        en: 'Find a mentor for deeper knowledge of this career',
      },
    ],
  },
  {
    id: REFLECTION_V2_QUESTION_IDS.feedback,
    order: 4,
    type: 'free_text',
    vi: 'Feedback về chất lượng khóa học mà bạn muốn chúng tôi cải thiện',
    en: 'What course-quality feedback would you like us to improve?',
    options: null,
  },
  {
    id: REFLECTION_V2_QUESTION_IDS.shareIntent,
    order: 5,
    type: 'selection',
    vi: 'Bạn có dự định chia sẻ nền tảng học tập hướng nghiệp này cho bạn bè/người quen?',
    en: 'Do you intend to share this career-guidance platform with friends/acquaintances?',
    options: [
      { key: 1, vi: 'Chắc chắn', en: 'Definitely' },
      { key: 2, vi: 'Không phải lúc này', en: 'Not at this time' },
    ],
  },
];

/**
 * Epic 4.6 — the certificate-screen career reflection moves from Epic 4.1's
 * six Likert questions to five: two free text, three single choice.
 *
 * **Nothing already answered is deleted.** Every existing question is
 * converted into a shape the new CHECK accepts and then deactivated, so the
 * answers that reference it keep a valid parent:
 *
 * - a `slider` becomes a `selection` with keys 1–5 — exactly the values a
 *   slider could store — keeping its end labels on keys 1 and 5;
 * - a `radio`/`select` becomes a `selection`, its options renamed from
 *   `value` to `key` with the numbers untouched.
 *
 * Deactivated rows drop out of the student form (which reads active questions
 * only) while staying available to anyone auditing old responses.
 *
 * **The CHECKs are dropped with `IF EXISTS`.** A database built by replaying
 * migrations has `CK_crq_question_type` and `CK_crq_shape`; the dev database
 * does not, because an earlier generated drift migration removed them.
 */
export class ReworkCareerReflection1787500000000 implements MigrationInterface {
  name = 'ReworkCareerReflection1787500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "career_reflection_question"
         DROP CONSTRAINT IF EXISTS "CK_crq_shape",
         DROP CONSTRAINT IF EXISTS "CK_crq_question_type"`,
    );

    await queryRunner.query(
      `ALTER TABLE "career_reflection_question"
         ADD COLUMN "question_text_translations" jsonb,
         ADD COLUMN "is_required" boolean NOT NULL DEFAULT true`,
    );

    // radio/select: rename each option's `value` to `key`, preserving order
    // and every other property (including `labelTranslations`).
    await queryRunner.query(
      `UPDATE "career_reflection_question" q
          SET "options" = (
                SELECT jsonb_agg(
                         (o - 'value') || jsonb_build_object('key', o -> 'value')
                         ORDER BY ord)
                  FROM jsonb_array_elements(q."options") WITH ORDINALITY AS t(o, ord)
              ),
              "question_type" = 'selection'
        WHERE q."question_type" IN ('radio', 'select')
          AND q."options" IS NOT NULL`,
    );

    // slider: keys 1–5 are precisely what `rating_answer` could hold, so every
    // existing answer stays a valid key. The two end labels survive on 1 and 5.
    await queryRunner.query(
      `UPDATE "career_reflection_question"
          SET "options" = jsonb_build_array(
                jsonb_build_object('key', 1,
                  'label', COALESCE("label_min", '1'),
                  'labelTranslations', "label_min_translations"),
                jsonb_build_object('key', 2, 'label', '2'),
                jsonb_build_object('key', 3, 'label', '3'),
                jsonb_build_object('key', 4, 'label', '4'),
                jsonb_build_object('key', 5,
                  'label', COALESCE("label_max", '5'),
                  'labelTranslations', "label_max_translations")
              ),
              "question_type" = 'selection'
        WHERE "question_type" = 'slider'`,
    );

    await queryRunner.query(
      `UPDATE "career_reflection_question" SET "is_active" = false`,
    );

    await queryRunner.query(
      `ALTER TABLE "career_reflection_question"
         DROP COLUMN "label_min",
         DROP COLUMN "label_max",
         DROP COLUMN "label_min_translations",
         DROP COLUMN "label_max_translations",
         ALTER COLUMN "question_type" DROP DEFAULT`,
    );

    await queryRunner.query(
      `ALTER TABLE "career_reflection_question"
         ADD CONSTRAINT "CK_crq_question_type"
         CHECK ("question_type" IN ('free_text', 'selection'))`,
    );

    await queryRunner.query(
      `ALTER TABLE "career_reflection_question"
         ADD CONSTRAINT "CK_crq_shape" CHECK (
           ("question_type" = 'free_text' AND "options" IS NULL)
        OR ("question_type" = 'selection' AND "options" IS NOT NULL
            AND jsonb_typeof("options") = 'array'
            AND jsonb_array_length("options") BETWEEN 2 AND 7)
         )`,
    );

    /**
     * D4 — one answer per (enrolment, question), which is what makes a
     * re-submit an upsert. The old write path did a read-then-write with no
     * constraint behind it, so two concurrent submits could have produced
     * duplicates; keep the most recently written one before enforcing.
     */
    await queryRunner.query(
      `DELETE FROM "career_reflection_answer" a
        USING "career_reflection_answer" b
        WHERE a."enrollment_id" = b."enrollment_id"
          AND a."question_id" = b."question_id"
          AND (a."updated_at", a."id") < (b."updated_at", b."id")`,
    );

    await queryRunner.query(
      `ALTER TABLE "career_reflection_answer"
         ADD CONSTRAINT "UQ_cra_enrollment_question"
         UNIQUE ("enrollment_id", "question_id")`,
    );

    // The unique constraint leads with `enrollment_id`, so its index already
    // answers every lookup Epic 7's single-column index existed for.
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_cra_enrollment"`,
    );

    for (const seed of SEEDS) {
      await queryRunner.query(
        `INSERT INTO "career_reflection_question"
           ("id", "question_type", "question_text", "question_text_translations",
            "options", "is_required", "is_active", "display_order", "course_id")
         VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, true, true, $6, NULL)
         ON CONFLICT ("id") DO NOTHING`,
        [
          seed.id,
          seed.type,
          seed.vi,
          JSON.stringify({ en: seed.en }),
          seed.options === null
            ? null
            : JSON.stringify(
                seed.options.map((option) => ({
                  key: option.key,
                  label: option.vi,
                  labelTranslations: { en: option.en },
                })),
              ),
          seed.order,
        ],
      );
    }
  }

  /**
   * Restores the Epic 4.1 schema. **Lossy by necessity:**
   *
   * - the five seeded questions and their answers are removed;
   * - any other `free_text` question, and its answers, is removed too — the old
   *   CHECK has no shape a free-text question fits;
   * - converted sliders come back as `select` questions, since which rows were
   *   sliders is not recorded, and their end labels are not restored.
   */
  public async down(queryRunner: QueryRunner): Promise<void> {
    const ids = Object.values(REFLECTION_V2_QUESTION_IDS);

    await queryRunner.query(
      `DELETE FROM "career_reflection_answer"
        WHERE "question_id" = ANY($1::uuid[])
           OR "question_id" IN (SELECT "id" FROM "career_reflection_question"
                                 WHERE "question_type" = 'free_text')`,
      [ids],
    );
    await queryRunner.query(
      `DELETE FROM "career_reflection_question"
        WHERE "id" = ANY($1::uuid[]) OR "question_type" = 'free_text'`,
      [ids],
    );

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_cra_enrollment"
         ON "career_reflection_answer" ("enrollment_id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "career_reflection_answer"
         DROP CONSTRAINT IF EXISTS "UQ_cra_enrollment_question"`,
    );

    await queryRunner.query(
      `ALTER TABLE "career_reflection_question"
         DROP CONSTRAINT IF EXISTS "CK_crq_shape",
         DROP CONSTRAINT IF EXISTS "CK_crq_question_type"`,
    );

    await queryRunner.query(
      `ALTER TABLE "career_reflection_question"
         ADD COLUMN "label_min" character varying(100),
         ADD COLUMN "label_max" character varying(100),
         ADD COLUMN "label_min_translations" jsonb,
         ADD COLUMN "label_max_translations" jsonb,
         ALTER COLUMN "question_type" SET DEFAULT 'slider'`,
    );

    await queryRunner.query(
      `UPDATE "career_reflection_question" q
          SET "options" = (
                SELECT jsonb_agg(
                         (o - 'key') || jsonb_build_object('value', o -> 'key')
                         ORDER BY ord)
                  FROM jsonb_array_elements(q."options") WITH ORDINALITY AS t(o, ord)
              ),
              "question_type" = 'select'
        WHERE q."question_type" = 'selection'`,
    );

    await queryRunner.query(
      `ALTER TABLE "career_reflection_question"
         DROP COLUMN "is_required",
         DROP COLUMN "question_text_translations"`,
    );

    await queryRunner.query(
      `ALTER TABLE "career_reflection_question"
         ADD CONSTRAINT "CK_crq_question_type"
         CHECK ("question_type" IN ('slider', 'radio', 'select'))`,
    );
    await queryRunner.query(
      `ALTER TABLE "career_reflection_question"
         ADD CONSTRAINT "CK_crq_shape" CHECK (
           ("question_type" = 'slider' AND "options" IS NULL)
        OR ("question_type" <> 'slider' AND "options" IS NOT NULL
            AND jsonb_typeof("options") = 'array'
            AND jsonb_array_length("options") BETWEEN 2 AND 7)
         )`,
    );
  }
}
