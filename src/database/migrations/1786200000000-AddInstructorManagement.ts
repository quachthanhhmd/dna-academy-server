import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Epic 5 — Instructor Management.
 *
 * Introduces the first-class `instructor` entity plus its three satellite
 * tables, backfills one instructor per user currently referenced by
 * `course."instructorId"`, and finally drops that column so a course's
 * teaching staff lives exclusively in `course_instructor`.
 */
export class AddInstructorManagement1786200000000 implements MigrationInterface {
  name = 'AddInstructorManagement1786200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "instructor" (
        "slug" character varying NOT NULL,
        "fullName" character varying NOT NULL,
        "headline" character varying,
        "bio" text,
        "profilePictureUrl" character varying,
        "emailPublic" character varying,
        "yearsOfExperience" integer,
        "isActive" boolean NOT NULL DEFAULT true,
        "displayOrder" integer NOT NULL DEFAULT 0,
        "totalCourses" integer NOT NULL DEFAULT 0,
        "totalStudents" integer NOT NULL DEFAULT 0,
        "avgRating" numeric(3,2),
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "userId" integer,
        "createdById" integer,
        CONSTRAINT "UQ_instructor_userId" UNIQUE ("userId"),
        CONSTRAINT "PK_instructor" PRIMARY KEY ("id")
      )`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_instructor_slug_unique" ON "instructor" ("slug")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_instructor_isActive_displayOrder" ON "instructor" ("displayOrder", "isActive")`,
    );
    await queryRunner.query(
      `ALTER TABLE "instructor" ADD CONSTRAINT "FK_a914853943da2844065d6e5c383" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "instructor" ADD CONSTRAINT "FK_ce6e86bd3994debeedb4e37e050" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );

    await queryRunner.query(
      `CREATE TABLE "course_instructor" (
        "role" character varying NOT NULL DEFAULT 'primary',
        "displayOrder" integer NOT NULL DEFAULT 0,
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "courseId" uuid NOT NULL,
        "instructorId" uuid NOT NULL,
        CONSTRAINT "CK_course_instructor_role" CHECK ("role" IN ('primary', 'co_instructor', 'guest')),
        CONSTRAINT "PK_course_instructor" PRIMARY KEY ("id")
      )`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_course_instructor_pair_unique" ON "course_instructor" ("courseId", "instructorId")`,
    );
    // Partial unique index — the application also demotes the old primary
    // before promoting the new one so this can never fire on a normal edit.
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_course_instructor_one_primary" ON "course_instructor" ("courseId") WHERE "role" = 'primary'`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_course_instructor_instructorId" ON "course_instructor" ("courseId", "instructorId")`,
    );
    await queryRunner.query(
      `ALTER TABLE "course_instructor" ADD CONSTRAINT "FK_2d903e73a7da87b36f79dbe8400" FOREIGN KEY ("courseId") REFERENCES "course"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "course_instructor" ADD CONSTRAINT "FK_8c4dda917b09dd3b4fc47dcb6b3" FOREIGN KEY ("instructorId") REFERENCES "instructor"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );

    await queryRunner.query(
      `CREATE TABLE "instructor_expertise" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "instructorId" uuid NOT NULL,
        "expertiseCodeId" uuid NOT NULL,
        CONSTRAINT "PK_instructor_expertise" PRIMARY KEY ("id")
      )`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_instructor_expertise_pair_unique" ON "instructor_expertise" ("instructorId", "expertiseCodeId")`,
    );
    await queryRunner.query(
      `ALTER TABLE "instructor_expertise" ADD CONSTRAINT "FK_c14f1b79880fe58a57be3e7f993" FOREIGN KEY ("instructorId") REFERENCES "instructor"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "instructor_expertise" ADD CONSTRAINT "FK_356530d9755d06cfcaa76a76869" FOREIGN KEY ("expertiseCodeId") REFERENCES "master_data_code"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );

    await queryRunner.query(
      `CREATE TABLE "instructor_social_link" (
        "platform" character varying NOT NULL,
        "url" text NOT NULL,
        "displayOrder" integer NOT NULL DEFAULT 0,
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "instructorId" uuid NOT NULL,
        CONSTRAINT "PK_instructor_social_link" PRIMARY KEY ("id")
      )`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_instructor_social_link_instructorId" ON "instructor_social_link" ("instructorId")`,
    );
    await queryRunner.query(
      `ALTER TABLE "instructor_social_link" ADD CONSTRAINT "FK_050584f96d4d000248abf4470e6" FOREIGN KEY ("instructorId") REFERENCES "instructor"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );

    // --- Backfill -------------------------------------------------------
    // One instructor profile per user that any course currently points at.
    // The slug is derived from fullName and suffixed with the user id, which
    // is both deterministic and guaranteed unique without needing `unaccent`.
    await queryRunner.query(
      `INSERT INTO "instructor" ("userId", "slug", "fullName", "profilePictureUrl", "isActive", "displayOrder", "totalCourses", "totalStudents")
       SELECT
         u."id",
         trim(both '-' from regexp_replace(lower(coalesce(u."fullName", 'instructor')), '[^a-z0-9]+', '-', 'g')) || '-' || u."id",
         coalesce(u."fullName", 'Instructor ' || u."id"),
         u."profilePictureUrl",
         true,
         0,
         0,
         0
       FROM "user" u
       WHERE EXISTS (
         SELECT 1 FROM "course" c WHERE c."instructorId" = u."id"
       )`,
    );

    await queryRunner.query(
      `INSERT INTO "course_instructor" ("courseId", "instructorId", "role", "displayOrder")
       SELECT c."id", i."id", 'primary', 0
       FROM "course" c
       JOIN "instructor" i ON i."userId" = c."instructorId"
       WHERE c."instructorId" IS NOT NULL`,
    );

    await queryRunner.query(
      `UPDATE "instructor" i
       SET "totalCourses" = (
         SELECT count(*) FROM "course_instructor" ci WHERE ci."instructorId" = i."id"
       )`,
    );

    // --- Drop the old direct FK ----------------------------------------
    await queryRunner.query(
      `ALTER TABLE "course" DROP CONSTRAINT "FK_32d94af473bb59d808d9a68e17b"`,
    );
    await queryRunner.query(`ALTER TABLE "course" DROP COLUMN "instructorId"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "course" ADD "instructorId" integer`);
    await queryRunner.query(
      `ALTER TABLE "course" ADD CONSTRAINT "FK_32d94af473bb59d808d9a68e17b" FOREIGN KEY ("instructorId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );

    // Restore only what the forward migration could have moved: the primary
    // instructor of each course, and only when it is linked to a user.
    await queryRunner.query(
      `UPDATE "course" c
       SET "instructorId" = i."userId"
       FROM "course_instructor" ci
       JOIN "instructor" i ON i."id" = ci."instructorId"
       WHERE ci."courseId" = c."id" AND ci."role" = 'primary' AND i."userId" IS NOT NULL`,
    );

    await queryRunner.query(`DROP TABLE "instructor_social_link"`);
    await queryRunner.query(`DROP TABLE "instructor_expertise"`);
    await queryRunner.query(`DROP TABLE "course_instructor"`);
    await queryRunner.query(`DROP TABLE "instructor"`);
  }
}
