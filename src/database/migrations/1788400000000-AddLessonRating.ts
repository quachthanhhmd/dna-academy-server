import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * The "Đánh giá" lesson type: a lesson whose content is one 1–5 question
 * (`lecture_content_rating`) and whose learner answers are one row per
 * enrollment (`lecture_rating_response`).
 *
 * Both cascade from the lesson, and responses from the enrollment, so deleting
 * a lesson, a course or a learner never trips over them. Not to be confused
 * with `course_rating`, the course-level rating on the certificate screen.
 */
export class AddLessonRating1788400000000 implements MigrationInterface {
  name = 'AddLessonRating1788400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "lecture_content_rating" ("allow_comment" boolean NOT NULL, "label_max" character varying, "label_min" character varying, "prompt" character varying NOT NULL, "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "lecture_id" uuid NOT NULL, CONSTRAINT "REL_358b537422183a7f07cb470277" UNIQUE ("lecture_id"), CONSTRAINT "PK_250a84e3bf289a94826b8b50fff" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "lecture_rating_response" ("submitted_at" TIMESTAMP WITH TIME ZONE NOT NULL, "comment" character varying, "rating" smallint NOT NULL, "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "enrollment_id" uuid NOT NULL, "lecture_id" uuid NOT NULL, CONSTRAINT "UQ_lecture_rating_response_lecture_enrollment" UNIQUE ("lecture_id", "enrollment_id"), CONSTRAINT "CK_lecture_rating_response_rating_1_5" CHECK ("rating" BETWEEN 1 AND 5), CONSTRAINT "PK_edf9bf3d1814dabc8dad25f20a4" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "lecture_content_rating" ADD CONSTRAINT "FK_358b537422183a7f07cb4702778" FOREIGN KEY ("lecture_id") REFERENCES "lecture"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "lecture_rating_response" ADD CONSTRAINT "FK_6aac6d0fef0a5937698ad0d9a0e" FOREIGN KEY ("lecture_id") REFERENCES "lecture"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "lecture_rating_response" ADD CONSTRAINT "FK_1edfb076122a18d21cfd0e30588" FOREIGN KEY ("enrollment_id") REFERENCES "enrollment"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "lecture_rating_response" DROP CONSTRAINT "FK_1edfb076122a18d21cfd0e30588"`,
    );
    await queryRunner.query(
      `ALTER TABLE "lecture_rating_response" DROP CONSTRAINT "FK_6aac6d0fef0a5937698ad0d9a0e"`,
    );
    await queryRunner.query(
      `ALTER TABLE "lecture_content_rating" DROP CONSTRAINT "FK_358b537422183a7f07cb4702778"`,
    );
    await queryRunner.query(`DROP TABLE "lecture_rating_response"`);
    await queryRunner.query(`DROP TABLE "lecture_content_rating"`);
  }
}
