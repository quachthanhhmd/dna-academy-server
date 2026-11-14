import {
  ConflictException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';

/**
 * The course's own rows, children before parents. Most foreign keys into
 * course / section / lecture are NO ACTION, so the order is what makes the
 * delete possible; each statement takes the course id as $1.
 *
 * Only authored content is listed. Everything a learner produces hangs off
 * an enrollment, and a course with enrollments is never deleted (see
 * `remove`), so none of it can exist here. Rating and survey content
 * cascade from the lecture; course_instructor cascades from the course;
 * form_submission.selected_course_id is set to null by its own FK.
 */
const LECTURES_OF_COURSE = `
  SELECT l."id" FROM "lecture" l
  JOIN "section" s ON s."id" = l."section_id"
  WHERE s."course_id" = $1`;

export const COURSE_DELETE_STATEMENTS: readonly string[] = [
  `DELETE FROM "quiz_answer_option" WHERE "question_id" IN (
     SELECT "id" FROM "quiz_question" WHERE "lecture_id" IN (${LECTURES_OF_COURSE}))`,
  `DELETE FROM "quiz_question" WHERE "lecture_id" IN (${LECTURES_OF_COURSE})`,
  `DELETE FROM "lecture_content_quiz" WHERE "lecture_id" IN (${LECTURES_OF_COURSE})`,
  `DELETE FROM "reflection_question" WHERE "lecture_id" IN (${LECTURES_OF_COURSE})`,
  `DELETE FROM "lecture_content_reflection" WHERE "lecture_id" IN (${LECTURES_OF_COURSE})`,
  `DELETE FROM "lecture_content_video" WHERE "lecture_id" IN (${LECTURES_OF_COURSE})`,
  `DELETE FROM "lecture_content_article" WHERE "lecture_id" IN (${LECTURES_OF_COURSE})`,
  `DELETE FROM "lecture_content_document" WHERE "lecture_id" IN (${LECTURES_OF_COURSE})`,
  `DELETE FROM "lecture" WHERE "id" IN (${LECTURES_OF_COURSE})`,
  `DELETE FROM "section" WHERE "course_id" = $1`,
  `DELETE FROM "course_learning_outcome" WHERE "course_id" = $1`,
  `DELETE FROM "course_requirement" WHERE "course_id" = $1`,
  `DELETE FROM "course_target_learner" WHERE "course_id" = $1`,
  `DELETE FROM "course_group_assignment" WHERE "course_id" = $1`,
  // Course-specific career reflection questions; global ones have no course.
  `DELETE FROM "career_reflection_question" WHERE "course_id" = $1`,
  `DELETE FROM "course" WHERE "id" = $1`,
];

/**
 * Deletes a course from the admin course list.
 *
 * Refused (409 COURSE_HAS_ENROLLMENTS) once anyone has enrolled: deleting
 * would take their progress, submitted work, ratings and certificates with
 * it. Such a course is unpublished instead. A course nobody enrolled in is
 * removed entirely, in one transaction, so a failure leaves it untouched
 * rather than half-deleted.
 */
@Injectable()
export class CourseDeletionAdminService {
  constructor(private readonly dataSource: DataSource) {}

  async remove(courseId: string): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const [course] = await manager.query(
        `SELECT "id" FROM "course" WHERE "id" = $1 FOR UPDATE`,
        [courseId],
      );
      if (!course) {
        throw new NotFoundException({
          status: HttpStatus.NOT_FOUND,
          error: 'courseNotFound',
        });
      }

      const [{ count }] = await manager.query(
        `SELECT COUNT(*)::int AS "count" FROM "enrollment" WHERE "course_id" = $1`,
        [courseId],
      );
      if (count > 0) {
        throw new ConflictException({
          status: HttpStatus.CONFLICT,
          code: 'COURSE_HAS_ENROLLMENTS',
          enrollments: count,
        });
      }

      for (const statement of COURSE_DELETE_STATEMENTS) {
        await manager.query(statement, [courseId]);
      }
    });
  }
}
