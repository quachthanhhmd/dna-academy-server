import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCourseCourseId1786100000000 implements MigrationInterface {
  name = 'AddCourseCourseId1786100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "course" ADD "courseId" character varying`,
    );
    // Nullable so existing rows survive; Postgres allows multiple NULLs under a
    // unique index, while every non-null business code stays unique.
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_course_courseId_unique" ON "course" ("courseId")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_course_courseId_unique"`);
    await queryRunner.query(`ALTER TABLE "course" DROP COLUMN "courseId"`);
  }
}
