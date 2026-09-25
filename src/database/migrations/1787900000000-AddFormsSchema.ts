import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * EPIC-08 — Forms & Submissions.
 *
 * Eight tables plus the two indexes that carry rules rather than speed:
 * `UQ_form_submission_live` (one live submission per form, person and course,
 * which is what makes re-submission append-only) and
 * `UQ_master_data_code_group_code` (the uniqueness the master-data seeder has
 * depended on all along without the schema providing it).
 *
 * Columns are the epic's §2.2/§2.3 DDL verbatim — snake_case, unlike the older
 * camelCase tables — because the analytics queries, index names and seed
 * upserts in that document are all written against these names.
 */
export class AddFormsSchema1787900000000 implements MigrationInterface {
  name = 'AddFormsSchema1787900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ---- Form definition -------------------------------------------------
    await queryRunner.query(
      `CREATE TABLE "form_definition" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "code" character varying(64) NOT NULL,
        "name_translations" jsonb NOT NULL,
        "description_translations" jsonb,
        "version" integer NOT NULL DEFAULT 1,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_form_definition_code" UNIQUE ("code"),
        CONSTRAINT "PK_form_definition" PRIMARY KEY ("id")
      )`,
    );

    await queryRunner.query(
      `CREATE TABLE "form_question" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "form_definition_id" uuid NOT NULL,
        "code" character varying(64) NOT NULL,
        "section_code" character varying(64) NOT NULL,
        "question_type" character varying(32) NOT NULL,
        "master_data_group_key" character varying(64),
        "is_required" boolean NOT NULL DEFAULT false,
        "display_order" integer NOT NULL DEFAULT 0,
        "label_translations" jsonb NOT NULL,
        "placeholder_translations" jsonb,
        "helper_translations" jsonb,
        "min_length" integer,
        "max_length" integer,
        "allow_other" boolean NOT NULL DEFAULT false,
        "consent_code" character varying(64),
        "parent_question_id" uuid,
        "parent_option_code" character varying(64),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_form_question_form_code" UNIQUE ("form_definition_id", "code"),
        CONSTRAINT "CHK_form_question_type" CHECK ("question_type" IN
          ('short_text','long_text','email','phone','url',
           'single_select','multi_select','consent')),
        CONSTRAINT "PK_form_question" PRIMARY KEY ("id")
      )`,
    );
    await queryRunner.query(
      `ALTER TABLE "form_question" ADD CONSTRAINT "FK_form_question_definition" FOREIGN KEY ("form_definition_id") REFERENCES "form_definition"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "form_question" ADD CONSTRAINT "FK_form_question_parent" FOREIGN KEY ("parent_question_id") REFERENCES "form_question"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );

    /*
      A question shows a SUBSET of its master-data group, in its own order:
      Form A offers six professions, Form B eleven. An empty allowlist means
      the whole group, so a question that offers everything needs no rows.
    */
    await queryRunner.query(
      `CREATE TABLE "form_question_option" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "question_id" uuid NOT NULL,
        "option_code" character varying(64) NOT NULL,
        "display_order" integer NOT NULL DEFAULT 0,
        CONSTRAINT "UQ_form_question_option" UNIQUE ("question_id", "option_code"),
        CONSTRAINT "PK_form_question_option" PRIMARY KEY ("id")
      )`,
    );
    await queryRunner.query(
      `ALTER TABLE "form_question_option" ADD CONSTRAINT "FK_form_question_option_question" FOREIGN KEY ("question_id") REFERENCES "form_question"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );

    // ---- Submissions -----------------------------------------------------
    await queryRunner.query(
      `CREATE TABLE "form_submission" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "form_definition_id" uuid NOT NULL,
        "form_version" integer NOT NULL,
        "user_id" integer,
        "full_name" character varying(160) NOT NULL,
        "email" character varying(255) NOT NULL,
        "email_normalized" character varying(255) NOT NULL,
        "phone" character varying(32),
        "primary_field_code" character varying(64),
        "selected_course_id" uuid,
        "status" character varying(24) NOT NULL DEFAULT 'new',
        "assigned_to_user_id" integer,
        "internal_notes" text,
        "is_latest" boolean NOT NULL DEFAULT true,
        "superseded_by_id" uuid,
        "source" character varying(24) NOT NULL DEFAULT 'landing',
        "locale" character varying(8) NOT NULL DEFAULT 'vi',
        "utm" jsonb,
        "ip_hash" character varying(64),
        "ip_hash_day" date,
        "user_agent" character varying(255),
        "is_suspicious" boolean NOT NULL DEFAULT false,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "CHK_form_submission_status" CHECK ("status" IN
          ('new','reviewing','contacted','grouped','approved','rejected','archived')),
        CONSTRAINT "CHK_form_submission_source" CHECK ("source" IN
          ('landing','certificate','catalog','other')),
        CONSTRAINT "PK_form_submission" PRIMARY KEY ("id")
      )`,
    );
    await queryRunner.query(
      `ALTER TABLE "form_submission" ADD CONSTRAINT "FK_form_submission_definition" FOREIGN KEY ("form_definition_id") REFERENCES "form_definition"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "form_submission" ADD CONSTRAINT "FK_form_submission_user" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "form_submission" ADD CONSTRAINT "FK_form_submission_course" FOREIGN KEY ("selected_course_id") REFERENCES "course"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "form_submission" ADD CONSTRAINT "FK_form_submission_assignee" FOREIGN KEY ("assigned_to_user_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "form_submission" ADD CONSTRAINT "FK_form_submission_superseded_by" FOREIGN KEY ("superseded_by_id") REFERENCES "form_submission"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );

    /*
      One live submission per (form, person, course) — a second course is a
      second row. The append-only flip and this insert share a transaction, or
      a re-submission hits this index.
    */
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_form_submission_live" ON "form_submission" ("form_definition_id", "email_normalized", COALESCE("selected_course_id", '00000000-0000-0000-0000-000000000000'::uuid)) WHERE "is_latest"`,
    );

    await queryRunner.query(
      `CREATE TABLE "form_answer" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "submission_id" uuid NOT NULL,
        "question_id" uuid NOT NULL,
        "text_value" text,
        "number_value" numeric(10,2),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_form_answer_submission_question" UNIQUE ("submission_id", "question_id"),
        CONSTRAINT "PK_form_answer" PRIMARY KEY ("id")
      )`,
    );
    await queryRunner.query(
      `ALTER TABLE "form_answer" ADD CONSTRAINT "FK_form_answer_submission" FOREIGN KEY ("submission_id") REFERENCES "form_submission"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "form_answer" ADD CONSTRAINT "FK_form_answer_question" FOREIGN KEY ("question_id") REFERENCES "form_question"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );

    // One row per selected option: the reason every chart stays a GROUP BY.
    await queryRunner.query(
      `CREATE TABLE "form_answer_option" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "answer_id" uuid NOT NULL,
        "question_id" uuid NOT NULL,
        "submission_id" uuid NOT NULL,
        "option_code" character varying(64) NOT NULL,
        "option_group_key" character varying(64),
        CONSTRAINT "UQ_form_answer_option" UNIQUE ("answer_id", "option_code"),
        CONSTRAINT "PK_form_answer_option" PRIMARY KEY ("id")
      )`,
    );
    await queryRunner.query(
      `ALTER TABLE "form_answer_option" ADD CONSTRAINT "FK_form_answer_option_answer" FOREIGN KEY ("answer_id") REFERENCES "form_answer"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "form_answer_option" ADD CONSTRAINT "FK_form_answer_option_question" FOREIGN KEY ("question_id") REFERENCES "form_question"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "form_answer_option" ADD CONSTRAINT "FK_form_answer_option_submission" FOREIGN KEY ("submission_id") REFERENCES "form_submission"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );

    // Form A carries two consents, so one boolean column cannot say which.
    await queryRunner.query(
      `CREATE TABLE "form_submission_consent" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "submission_id" uuid NOT NULL,
        "consent_code" character varying(64) NOT NULL,
        "version" character varying(16) NOT NULL,
        "accepted_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_form_submission_consent" UNIQUE ("submission_id", "consent_code"),
        CONSTRAINT "PK_form_submission_consent" PRIMARY KEY ("id")
      )`,
    );
    await queryRunner.query(
      `ALTER TABLE "form_submission_consent" ADD CONSTRAINT "FK_form_submission_consent_submission" FOREIGN KEY ("submission_id") REFERENCES "form_submission"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );

    await queryRunner.query(
      `CREATE TABLE "form_submission_event" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "submission_id" uuid NOT NULL,
        "event" character varying(32) NOT NULL,
        "from_status" character varying(24),
        "to_status" character varying(24),
        "actor_user_id" integer,
        "payload" jsonb,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_form_submission_event" PRIMARY KEY ("id")
      )`,
    );
    await queryRunner.query(
      `ALTER TABLE "form_submission_event" ADD CONSTRAINT "FK_form_submission_event_submission" FOREIGN KEY ("submission_id") REFERENCES "form_submission"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "form_submission_event" ADD CONSTRAINT "FK_form_submission_event_actor" FOREIGN KEY ("actor_user_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );

    // ---- Indexes ---------------------------------------------------------
    await queryRunner.query(
      `CREATE INDEX "IDX_form_submission_form_created" ON "form_submission" ("form_definition_id", "created_at" DESC)`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_form_submission_status" ON "form_submission" ("status") WHERE "is_latest"`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_form_submission_field" ON "form_submission" ("primary_field_code") WHERE "is_latest"`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_form_submission_email_norm" ON "form_submission" ("email_normalized")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_form_submission_course" ON "form_submission" ("selected_course_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_form_answer_submission" ON "form_answer" ("submission_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_form_answer_option_q_code" ON "form_answer_option" ("question_id", "option_code")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_form_answer_option_sub" ON "form_answer_option" ("submission_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_form_event_submission" ON "form_submission_event" ("submission_id", "created_at" DESC)`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_form_submission_utm_gin" ON "form_submission" USING gin ("utm" jsonb_path_ops)`,
    );

    // The master-data seed's upsert has assumed this since it was written.
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_master_data_code_group_code" ON "master_data_code" ("group_id", "code")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "UQ_master_data_code_group_code"`,
    );

    await queryRunner.query(`DROP TABLE "form_submission_event"`);
    await queryRunner.query(`DROP TABLE "form_submission_consent"`);
    await queryRunner.query(`DROP TABLE "form_answer_option"`);
    await queryRunner.query(`DROP TABLE "form_answer"`);
    await queryRunner.query(`DROP TABLE "form_submission"`);
    await queryRunner.query(`DROP TABLE "form_question_option"`);
    await queryRunner.query(`DROP TABLE "form_question"`);
    await queryRunner.query(`DROP TABLE "form_definition"`);
  }
}
