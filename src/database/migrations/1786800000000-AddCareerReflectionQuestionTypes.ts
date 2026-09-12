import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Epic 4.1 §3.1 — makes the post-completion career-reflection form
 * data-driven.
 *
 * Existing rows are sliders, which is exactly what the current hardcoded form
 * draws, so the column default keeps them rendering unchanged.
 *
 * The two CHECK constraints encode D1: a slider is described by its two end
 * labels, a radio/select by its options, and neither shape may borrow the
 * other's fields. Without them a `radio` with no options is a row the FE
 * cannot render and nothing rejects.
 *
 * Label localization follows the Epic 6 convention: the plain column holds the
 * default locale (`vi`) and `*Translations` holds the overrides. The epic's
 * draft SQL backfilled English into the base columns — that would have put
 * English on a Vietnamese-default field, which is the half-localized outcome
 * §3.1 warned against, so the backfill is Vietnamese with `en` alongside.
 */
export class AddCareerReflectionQuestionTypes1786800000000 implements MigrationInterface {
  name = 'AddCareerReflectionQuestionTypes1786800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "career_reflection_question"
         ADD "questionType" character varying(20) NOT NULL DEFAULT 'slider',
         ADD "labelMin" character varying(100),
         ADD "labelMax" character varying(100),
         ADD "labelMinTranslations" jsonb,
         ADD "labelMaxTranslations" jsonb,
         ADD "options" jsonb`,
    );

    await queryRunner.query(
      `ALTER TABLE "career_reflection_question"
         ADD CONSTRAINT "CK_crq_question_type"
         CHECK ("questionType" IN ('slider','radio','select'))`,
    );

    // A radio/select must carry between 2 and 7 options; a slider must carry
    // none. `jsonb_typeof` guards against an object being stored where an
    // array belongs, which would pass a naive NOT NULL check.
    await queryRunner.query(
      `ALTER TABLE "career_reflection_question"
         ADD CONSTRAINT "CK_crq_shape" CHECK (
           ("questionType" =  'slider' AND "options" IS NULL)
        OR ("questionType" <> 'slider' AND "options" IS NOT NULL
            AND jsonb_typeof("options") = 'array'
            AND jsonb_array_length("options") BETWEEN 2 AND 7)
         )`,
    );

    // Backfill the seeded sliders so none renders without end labels.
    await queryRunner.query(
      `UPDATE "career_reflection_question"
          SET "labelMin" = COALESCE("labelMin", 'Không đồng ý'),
              "labelMax" = COALESCE("labelMax", 'Đồng ý'),
              "labelMinTranslations" =
                COALESCE("labelMinTranslations", '{"en":"Disagree"}'::jsonb),
              "labelMaxTranslations" =
                COALESCE("labelMaxTranslations", '{"en":"Agree"}'::jsonb)
        WHERE "questionType" = 'slider'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "career_reflection_question" DROP CONSTRAINT "CK_crq_shape"`,
    );
    await queryRunner.query(
      `ALTER TABLE "career_reflection_question" DROP CONSTRAINT "CK_crq_question_type"`,
    );
    await queryRunner.query(
      `ALTER TABLE "career_reflection_question"
         DROP COLUMN "options",
         DROP COLUMN "labelMaxTranslations",
         DROP COLUMN "labelMinTranslations",
         DROP COLUMN "labelMax",
         DROP COLUMN "labelMin",
         DROP COLUMN "questionType"`,
    );
  }
}
