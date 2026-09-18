import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * How a user relates to courses, through their own active instructor
 * profile. An inactive profile teaches nothing (§2.7).
 */
@Injectable()
export class CourseAccessRepository {
  constructor(private readonly dataSource: DataSource) {}

  async teachingRole(userId: number, courseId: string): Promise<string | null> {
    // A malformed id teaches nothing, rather than failing the uuid cast.
    if (!UUID.test(courseId ?? '')) {
      return null;
    }

    const rows: { role: string }[] = await this.dataSource.query(
      `SELECT ci."role"
         FROM "course_instructor" ci
         JOIN "instructor" i ON i."id" = ci."instructor_id"
        WHERE ci."course_id" = $1 AND i."user_id" = $2 AND i."is_active"`,
      [courseId, userId],
    );

    return rows[0]?.role ?? null;
  }

  async taughtCourses(
    userId: number,
  ): Promise<{ courseId: string; role: string }[]> {
    const rows: { course_id: string; role: string }[] =
      await this.dataSource.query(
        `SELECT ci."course_id", ci."role"
           FROM "course_instructor" ci
           JOIN "instructor" i ON i."id" = ci."instructor_id"
          WHERE i."user_id" = $1 AND i."is_active"
          ORDER BY ci."course_id"`,
        [userId],
      );

    return rows.map((row) => ({ courseId: row.course_id, role: row.role }));
  }

  /** `undefined` when the lecture does not exist. */
  async courseOfLecture(lectureId: string): Promise<string | undefined> {
    return this.single(
      `SELECT s."course_id" AS "id"
         FROM "lecture" l JOIN "section" s ON s."id" = l."section_id"
        WHERE l."id" = $1`,
      lectureId,
    );
  }

  async courseOfEnrollment(enrollmentId: string): Promise<string | undefined> {
    return this.single(
      `SELECT "course_id" AS "id" FROM "enrollment" WHERE "id" = $1`,
      enrollmentId,
    );
  }

  /**
   * `null` for a global question, `undefined` when the question does not
   * exist.
   */
  async courseOfCareerQuestion(
    questionId: string,
  ): Promise<string | null | undefined> {
    if (!UUID.test(questionId ?? '')) {
      return undefined;
    }

    const rows: { id: string | null }[] = await this.dataSource.query(
      `SELECT "course_id" AS "id" FROM "career_reflection_question" WHERE "id" = $1`,
      [questionId],
    );

    return rows.length ? rows[0].id : undefined;
  }

  private async single(sql: string, id: string): Promise<string | undefined> {
    // A malformed id is simply not found, like any other lookup here.
    if (!UUID.test(id ?? '')) {
      return undefined;
    }

    const rows: { id: string }[] = await this.dataSource.query(sql, [id]);

    return rows[0]?.id;
  }
}
