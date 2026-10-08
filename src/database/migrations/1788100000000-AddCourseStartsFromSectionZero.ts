import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * `course.starts_from_section_zero`: some courses keep a separate section 0
 * for the introduction, others fold the introduction into section 1. The flag
 * only changes how sections are numbered on screen; ordering stays
 * `display_order`. Defaults to false, so every existing course keeps
 * numbering from 1.
 */
export class AddCourseStartsFromSectionZero1788100000000 implements MigrationInterface {
  name = 'AddCourseStartsFromSectionZero1788100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "course" ADD "starts_from_section_zero" boolean NOT NULL DEFAULT false`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "course" DROP COLUMN "starts_from_section_zero"`,
    );
  }
}
