import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Deleting a user from the admin panel removes them from the system.
 *
 * Every foreign key to `user` was NO ACTION, so a real DELETE failed for
 * anyone who had ever enrolled, signed in or been assigned a role — which is
 * why "delete" was a soft delete that left the person, their sessions and
 * their data in place. This makes the database finish the job in the same
 * statement:
 *
 * - CASCADE for what belongs to the learner: enrollments and everything under
 *   them (progress, quiz attempts and answers, saves, reflections, career
 *   reflections, certificates, ratings), their profile, career interests,
 *   sessions, linked Google/Facebook accounts and role assignments.
 * - SET NULL for records that only remember who acted — a course's
 *   creator/publisher, the creator of master data or an instructor profile,
 *   the uploader of a file, the grader of an answer, who assigned a role —
 *   which keep existing without a name. Form submissions already SET NULL.
 *
 * `down` restores NO ACTION.
 */
const FOREIGN_KEYS: [string, string, string, string, string][] = [
  [
    'career_reflection_answer',
    'enrollment_id',
    'FK_db83c108a7ffaaafa4c6ae7644c',
    'enrollment',
    'CASCADE',
  ],
  [
    'certificate',
    'enrollment_id',
    'FK_a11a0623f33563e8f878875553a',
    'enrollment',
    'CASCADE',
  ],
  [
    'course_rating',
    'enrollment_id',
    'FK_4fa90d06b13eac5752b89b12376',
    'enrollment',
    'CASCADE',
  ],
  [
    'lecture_progress',
    'enrollment_id',
    'FK_d3a47dcac4e78b405c50f1d1092',
    'enrollment',
    'CASCADE',
  ],
  [
    'quiz_attempt',
    'enrollment_id',
    'FK_1fc7c68a73aeaa1be5a3326760c',
    'enrollment',
    'CASCADE',
  ],
  [
    'quiz_save',
    'enrollment_id',
    'FK_9b3fa6d34ee5d9bdf65a6ec116c',
    'enrollment',
    'CASCADE',
  ],
  [
    'reflection_response',
    'enrollment_id',
    'FK_13df4764520af2fe219ee74d82c',
    'enrollment',
    'CASCADE',
  ],
  [
    'quiz_attempt_answer',
    'attempt_id',
    'FK_48531ffcf28ef4bf761626cc75d',
    'quiz_attempt',
    'CASCADE',
  ],
  [
    'certificate',
    'student_id',
    'FK_404984efcaaa5afc0d2822a8e00',
    'user',
    'CASCADE',
  ],
  [
    'course_rating',
    'student_id',
    'FK_9372c6bd45b8410c793bceb08c7',
    'user',
    'CASCADE',
  ],
  [
    'enrollment',
    'student_id',
    'FK_eb0d79d7b8954d3129d032b0bb1',
    'user',
    'CASCADE',
  ],
  [
    'oauth_account',
    'user_id',
    'FK_e355ddb0b69b083cbf253345d1c',
    'user',
    'CASCADE',
  ],
  ['session', 'user_id', 'FK_30e98e8746699fb9af235410aff', 'user', 'CASCADE'],
  [
    'student_career_interest',
    'user_id',
    'FK_ab33570212fed1aaf44fac05f13',
    'user',
    'CASCADE',
  ],
  [
    'student_profile',
    'user_id',
    'FK_1f5209fc71a9181affa7647b8b5',
    'user',
    'CASCADE',
  ],
  ['user_role', 'user_id', 'FK_d0e5815877f7395a198a4cb0a46', 'user', 'CASCADE'],
  [
    'course',
    'created_by_id',
    'FK_f9fd9eca86a30ba191cecbbc7bd',
    'user',
    'SET NULL',
  ],
  [
    'course',
    'published_by_id',
    'FK_da31795082e293e82517ffab10b',
    'user',
    'SET NULL',
  ],
  [
    'course',
    'unpublished_by_id',
    'FK_5d627ac667f136c57a03057261b',
    'user',
    'SET NULL',
  ],
  [
    'instructor',
    'created_by_id',
    'FK_1b0f5517c46f58bf541d882cbe9',
    'user',
    'SET NULL',
  ],
  [
    'instructor',
    'user_id',
    'FK_017e5f8348ae0b4f877c6339dff',
    'user',
    'SET NULL',
  ],
  [
    'master_data_code',
    'created_by_id',
    'FK_e6c358a50fe12d35e8dadda351a',
    'user',
    'SET NULL',
  ],
  [
    'master_data_group',
    'created_by_id',
    'FK_ed2c3d92048713de01e0a6ae652',
    'user',
    'SET NULL',
  ],
  [
    'media_file',
    'uploaded_by_id',
    'FK_cbe4e7c1a0cfadf9ee32986812e',
    'user',
    'SET NULL',
  ],
  [
    'quiz_attempt_answer',
    'graded_by_id',
    'FK_852760bf342ac86aece429d2749',
    'user',
    'SET NULL',
  ],
  [
    'user_role',
    'assigned_by_id',
    'FK_9cbb77db19b830dbda4f8ee33d6',
    'user',
    'SET NULL',
  ],
];

export class UserDeleteCascades1788300000000 implements MigrationInterface {
  name = 'UserDeleteCascades1788300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const [table, column, name, parent, action] of FOREIGN_KEYS) {
      await queryRunner.query(
        `ALTER TABLE "${table}" DROP CONSTRAINT "${name}"`,
      );
      await queryRunner.query(
        `ALTER TABLE "${table}" ADD CONSTRAINT "${name}" FOREIGN KEY ("${column}") REFERENCES "${parent}"("id") ON DELETE ${action} ON UPDATE NO ACTION`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const [table, column, name, parent] of FOREIGN_KEYS) {
      await queryRunner.query(
        `ALTER TABLE "${table}" DROP CONSTRAINT "${name}"`,
      );
      await queryRunner.query(
        `ALTER TABLE "${table}" ADD CONSTRAINT "${name}" FOREIGN KEY ("${column}") REFERENCES "${parent}"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
      );
    }
  }
}
