import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * `course.coming_soon` — an unpublished course an admin has chosen to show in
 * the public catalog as "Sắp ra mắt": greyed out, not clickable, after every
 * published course. Off for every existing course.
 */
export class AddCourseComingSoon1788500000000 implements MigrationInterface {
  name = 'AddCourseComingSoon1788500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "course" ADD "coming_soon" boolean NOT NULL DEFAULT false`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "course" DROP COLUMN "coming_soon"`);
  }
}
