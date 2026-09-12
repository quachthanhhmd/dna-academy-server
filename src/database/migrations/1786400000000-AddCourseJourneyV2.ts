import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Epic 4 v2 §2.1 — course journey (learning + completion).
 *
 * Column names are camelCase to match the rest of this schema; the epic writes
 * them snake_case. `unpublishedBy` references `user(id)`, which is an integer
 * here, not the uuid the epic assumes.
 */
export class AddCourseJourneyV21786400000000 implements MigrationInterface {
  name = 'AddCourseJourneyV21786400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // --- 1. avgRating integer -> numeric(3,2) ---------------------------
    await queryRunner.query(
      `ALTER TABLE "course"
         ALTER COLUMN "avgRating" TYPE numeric(3,2) USING "avgRating"::numeric(3,2)`,
    );

    // --- 2. New course columns ------------------------------------------
    await queryRunner.query(
      `ALTER TABLE "course"
         ADD "unpublishedAt" TIMESTAMP,
         ADD "unpublishedById" integer,
         ADD "requiresSequentialCompletion" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE "course" ADD CONSTRAINT "FK_course_unpublishedById"
         FOREIGN KEY ("unpublishedById") REFERENCES "user"("id")
         ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );

    // --- 3. enrollmentSource -> enum ------------------------------------
    await queryRunner.query(
      `CREATE TYPE "public"."enrollment_source_enum" AS ENUM('organic', 'admin', 'coupon')`,
    );
    // Anything already stored outside the three known values is normalised to
    // 'organic' so the cast cannot fail on legacy rows.
    await queryRunner.query(
      `UPDATE "enrollment" SET "enrollmentSource" = 'organic'
        WHERE "enrollmentSource" IS NOT NULL
          AND "enrollmentSource" NOT IN ('organic', 'admin', 'coupon')`,
    );
    await queryRunner.query(
      `ALTER TABLE "enrollment"
         ALTER COLUMN "enrollmentSource" TYPE "public"."enrollment_source_enum"
         USING "enrollmentSource"::"public"."enrollment_source_enum"`,
    );

    // --- 4. Quiz time limit ----------------------------------------------
    await queryRunner.query(
      `ALTER TABLE "lecture_content_quiz" ADD "timeLimitSecs" integer`,
    );

    // --- 5. Career reflection category -----------------------------------
    await queryRunner.query(
      `ALTER TABLE "career_reflection_question" ADD "category" character varying`,
    );

    // --- 6. Value constraints --------------------------------------------
    await queryRunner.query(
      `UPDATE "enrollment" SET "progressPct" = LEAST(GREATEST("progressPct", 0), 100)
        WHERE "progressPct" < 0 OR "progressPct" > 100`,
    );
    await queryRunner.query(
      `ALTER TABLE "enrollment" ADD CONSTRAINT "CK_enrollment_progress_0_100"
         CHECK ("progressPct" BETWEEN 0 AND 100)`,
    );
    await queryRunner.query(
      `ALTER TABLE "course_rating" ADD CONSTRAINT "CK_course_rating_1_5"
         CHECK ("rating" BETWEEN 1 AND 5)`,
    );
    await queryRunner.query(
      `ALTER TABLE "course" ADD CONSTRAINT "CK_course_avg_rating_0_5"
         CHECK ("avgRating" IS NULL OR "avgRating" BETWEEN 0 AND 5)`,
    );
    await queryRunner.query(
      `ALTER TABLE "lecture_content_quiz" ADD CONSTRAINT "CK_quiz_passing_score_0_100"
         CHECK ("passingScore" BETWEEN 0 AND 100)`,
    );

    // --- 7. Enrollment uniqueness ----------------------------------------
    // Partial: a cancelled enrollment must not block re-enrolling.
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UX_enrollment_active"
         ON "enrollment" ("studentId", "courseId") WHERE "status" <> 'cancelled'`,
    );

    // --- 8. Hot-read indexes ---------------------------------------------
    await queryRunner.query(
      `CREATE INDEX "IDX_enrollment_student_status" ON "enrollment" ("studentId", "status")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_lecture_section_display_order" ON "lecture" ("sectionId", "displayOrder")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_section_course_display_order" ON "section" ("courseId", "displayOrder")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_course_status_published_at" ON "course" ("status", "publishedAt")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_lecture_progress_enrollment_status" ON "lecture_progress" ("enrollmentId", "status")`,
    );
    // One progress row per (enrollment, lecture) — the player upserts on it.
    await queryRunner.query(
      `DELETE FROM "lecture_progress" a USING "lecture_progress" b
        WHERE a."id" < b."id"
          AND a."enrollmentId" = b."enrollmentId"
          AND a."lectureId" = b."lectureId"`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UX_lecture_progress_enrollment_lecture"
         ON "lecture_progress" ("enrollmentId", "lectureId")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const index of [
      'UX_lecture_progress_enrollment_lecture',
      'IDX_lecture_progress_enrollment_status',
      'IDX_course_status_published_at',
      'IDX_section_course_display_order',
      'IDX_lecture_section_display_order',
      'IDX_enrollment_student_status',
      'UX_enrollment_active',
    ]) {
      await queryRunner.query(`DROP INDEX "public"."${index}"`);
    }

    await queryRunner.query(
      `ALTER TABLE "lecture_content_quiz" DROP CONSTRAINT "CK_quiz_passing_score_0_100"`,
    );
    await queryRunner.query(
      `ALTER TABLE "course" DROP CONSTRAINT "CK_course_avg_rating_0_5"`,
    );
    await queryRunner.query(
      `ALTER TABLE "course_rating" DROP CONSTRAINT "CK_course_rating_1_5"`,
    );
    await queryRunner.query(
      `ALTER TABLE "enrollment" DROP CONSTRAINT "CK_enrollment_progress_0_100"`,
    );

    await queryRunner.query(
      `ALTER TABLE "career_reflection_question" DROP COLUMN "category"`,
    );
    await queryRunner.query(
      `ALTER TABLE "lecture_content_quiz" DROP COLUMN "timeLimitSecs"`,
    );

    await queryRunner.query(
      `ALTER TABLE "enrollment"
         ALTER COLUMN "enrollmentSource" TYPE character varying
         USING "enrollmentSource"::text`,
    );
    await queryRunner.query(`DROP TYPE "public"."enrollment_source_enum"`);

    await queryRunner.query(
      `ALTER TABLE "course" DROP CONSTRAINT "FK_course_unpublishedById"`,
    );
    await queryRunner.query(
      `ALTER TABLE "course"
         DROP COLUMN "requiresSequentialCompletion",
         DROP COLUMN "unpublishedById",
         DROP COLUMN "unpublishedAt"`,
    );

    await queryRunner.query(
      `ALTER TABLE "course"
         ALTER COLUMN "avgRating" TYPE integer USING ROUND("avgRating")::integer`,
    );
  }
}
