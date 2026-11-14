import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * The "survey" lesson type.
 *
 * - survey_question / survey_question_option: the authored survey. Ids are
 *   stable across edits; a question or option that has answers is archived
 *   (`archived_at`), never deleted, so its answers survive.
 * - survey_response: one per lesson per enrollment; re-submitting updates it.
 * - survey_answer: one row per answered value — a row per chosen option, or
 *   one rating / text row — so a dashboard can aggregate with plain SQL.
 *
 * Everything cascades from the lesson, and responses from the enrollment.
 */
export class AddSurveyLesson1788600000000 implements MigrationInterface {
  name = 'AddSurveyLesson1788600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "survey_response" ("submitted_at" TIMESTAMP WITH TIME ZONE NOT NULL, "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "enrollment_id" uuid NOT NULL, "lecture_id" uuid NOT NULL, CONSTRAINT "UQ_survey_response_lecture_enrollment" UNIQUE ("lecture_id", "enrollment_id"), CONSTRAINT "PK_d9326eb52bf8b23d56a39ce419a" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "survey_question" ("archived_at" TIMESTAMP WITH TIME ZONE, "rating_label_max" character varying, "rating_label_min" character varying, "rating_max" smallint, "display_order" integer NOT NULL, "is_required" boolean NOT NULL, "question_text" character varying NOT NULL, "question_type" character varying NOT NULL, "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "lecture_id" uuid NOT NULL, CONSTRAINT "CK_survey_question_type" CHECK ("question_type" IN ('single_choice', 'multiple_choice', 'rating_scale', 'short_text', 'long_text')), CONSTRAINT "CK_survey_question_rating_max" CHECK ("rating_max" IS NULL OR "rating_max" IN (5, 10)), CONSTRAINT "PK_ec6d65e83fd7217202178b79907" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_survey_question_lecture" ON "survey_question" ("lecture_id")`,
    );
    await queryRunner.query(
      `CREATE TABLE "survey_question_option" ("archived_at" TIMESTAMP WITH TIME ZONE, "display_order" integer NOT NULL, "option_text" character varying NOT NULL, "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "question_id" uuid NOT NULL, CONSTRAINT "PK_4582a5069802624101619af4b91" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_survey_question_option_question" ON "survey_question_option" ("question_id")`,
    );
    await queryRunner.query(
      `CREATE TABLE "survey_answer" ("rating_value" smallint, "text_answer" text, "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "option_id" uuid, "question_id" uuid NOT NULL, "response_id" uuid NOT NULL, CONSTRAINT "CK_survey_answer_rating_value" CHECK ("rating_value" IS NULL OR "rating_value" BETWEEN 1 AND 10), CONSTRAINT "PK_5a2a931b95ad2a866f8bc039db9" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_survey_answer_question" ON "survey_answer" ("question_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_survey_answer_response" ON "survey_answer" ("response_id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "survey_response" ADD CONSTRAINT "FK_6972d89a96cd3661fdb5e1ff718" FOREIGN KEY ("enrollment_id") REFERENCES "enrollment"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "survey_response" ADD CONSTRAINT "FK_e65b1205bc3fceaf734e24271ec" FOREIGN KEY ("lecture_id") REFERENCES "lecture"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "survey_question" ADD CONSTRAINT "FK_d5d59c80649c9bef32db0f83d5e" FOREIGN KEY ("lecture_id") REFERENCES "lecture"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "survey_question_option" ADD CONSTRAINT "FK_910f3a33444d222380081daf9d5" FOREIGN KEY ("question_id") REFERENCES "survey_question"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "survey_answer" ADD CONSTRAINT "FK_f238c5c9f954d9d676e82e96121" FOREIGN KEY ("option_id") REFERENCES "survey_question_option"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "survey_answer" ADD CONSTRAINT "FK_169a371203a7379ef17ab7e9992" FOREIGN KEY ("question_id") REFERENCES "survey_question"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "survey_answer" ADD CONSTRAINT "FK_a7223b9109e9d9e0009e8bbc897" FOREIGN KEY ("response_id") REFERENCES "survey_response"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "survey_answer" DROP CONSTRAINT "FK_a7223b9109e9d9e0009e8bbc897"`,
    );
    await queryRunner.query(
      `ALTER TABLE "survey_answer" DROP CONSTRAINT "FK_169a371203a7379ef17ab7e9992"`,
    );
    await queryRunner.query(
      `ALTER TABLE "survey_answer" DROP CONSTRAINT "FK_f238c5c9f954d9d676e82e96121"`,
    );
    await queryRunner.query(
      `ALTER TABLE "survey_question_option" DROP CONSTRAINT "FK_910f3a33444d222380081daf9d5"`,
    );
    await queryRunner.query(
      `ALTER TABLE "survey_question" DROP CONSTRAINT "FK_d5d59c80649c9bef32db0f83d5e"`,
    );
    await queryRunner.query(
      `ALTER TABLE "survey_response" DROP CONSTRAINT "FK_e65b1205bc3fceaf734e24271ec"`,
    );
    await queryRunner.query(
      `ALTER TABLE "survey_response" DROP CONSTRAINT "FK_6972d89a96cd3661fdb5e1ff718"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_survey_answer_response"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_survey_answer_question"`);
    await queryRunner.query(`DROP TABLE "survey_answer"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_survey_question_option_question"`,
    );
    await queryRunner.query(`DROP TABLE "survey_question_option"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_survey_question_lecture"`,
    );
    await queryRunner.query(`DROP TABLE "survey_question"`);
    await queryRunner.query(`DROP TABLE "survey_response"`);
  }
}
