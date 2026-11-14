import { describe, expect, it, beforeEach, jest } from '@jest/globals';
import { ConflictException, NotFoundException } from '@nestjs/common';
import {
  COURSE_DELETE_STATEMENTS,
  CourseDeletionAdminService,
} from './course-deletion-admin.service';

describe('CourseDeletionAdminService', () => {
  let service: CourseDeletionAdminService;
  let query: jest.Mock<any>;
  let transaction: jest.Mock<any>;

  beforeEach(() => {
    query = jest.fn();
    transaction = (jest.fn() as jest.Mock<any>).mockImplementation(
      (run: (manager: { query: jest.Mock<any> }) => unknown) => run({ query }),
    );
    service = new CourseDeletionAdminService({ transaction } as any);
  });

  const answer = (course: unknown, enrollments: number) =>
    query.mockImplementation((sql: string) => {
      if (sql.includes('FOR UPDATE'))
        return Promise.resolve(course ? [course] : []);
      if (sql.includes('FROM "enrollment"')) {
        return Promise.resolve([{ count: enrollments }]);
      }
      return Promise.resolve([]);
    });

  it('should delete every authored row, children first, in one transaction', async () => {
    answer({ id: 'course-1' }, 0);

    await service.remove('course-1');

    expect(transaction).toHaveBeenCalledTimes(1);
    const deletes = query.mock.calls
      .map(([sql]) => sql as string)
      .filter((sql) => sql.trimStart().startsWith('DELETE'));
    expect(deletes).toEqual([...COURSE_DELETE_STATEMENTS]);
    expect(
      query.mock.calls.every(
        ([, params]) => (params as string[])[0] === 'course-1',
      ),
    ).toBe(true);
    // The course itself goes last, after everything that references it.
    expect(deletes[deletes.length - 1]).toContain('DELETE FROM "course" WHERE');
  });

  it('should refuse a course anyone has enrolled in, deleting nothing', async () => {
    answer({ id: 'course-1' }, 3);

    await expect(service.remove('course-1')).rejects.toMatchObject({
      response: { code: 'COURSE_HAS_ENROLLMENTS', enrollments: 3 },
    });
    await expect(service.remove('course-1')).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(
      query.mock.calls.some(([sql]) =>
        (sql as string).trimStart().startsWith('DELETE'),
      ),
    ).toBe(false);
  });

  it('should 404 an unknown course', async () => {
    answer(null, 0);

    await expect(service.remove('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('should delete lecture content before lectures, lectures before sections', () => {
    const at = (fragment: string) =>
      COURSE_DELETE_STATEMENTS.findIndex((sql) => sql.includes(fragment));

    expect(at('DELETE FROM "quiz_answer_option"')).toBeLessThan(
      at('DELETE FROM "quiz_question"'),
    );
    expect(at('DELETE FROM "lecture_content_video"')).toBeLessThan(
      at('DELETE FROM "lecture" '),
    );
    expect(at('DELETE FROM "lecture" ')).toBeLessThan(
      at('DELETE FROM "section"'),
    );
    expect(at('DELETE FROM "section"')).toBeLessThan(
      at('DELETE FROM "course" '),
    );
  });
});
