import { describe, expect, it, beforeEach, jest } from '@jest/globals';
import { CourseInstructorsService } from './course-instructors.service';

describe('CourseInstructorsService', () => {
  let service: CourseInstructorsService;
  let repository: {
    findByCourseId: jest.Mock<any>;
    findByCourseIds: jest.Mock<any>;
  };

  const instructor = (id: string) => ({
    id,
    slug: `slug-${id}`,
    fullName: `Instructor ${id}`,
    headline: null,
    profilePictureUrl: null,
  });

  const row = (
    courseId: string,
    instructorId: string,
    role: string,
    displayOrder: number,
  ) => ({
    course: { id: courseId },
    instructor: instructor(instructorId),
    role,
    displayOrder,
  });

  beforeEach(() => {
    repository = { findByCourseId: jest.fn(), findByCourseIds: jest.fn() };
    repository.findByCourseId.mockResolvedValue([]);
    repository.findByCourseIds.mockResolvedValue([]);

    service = new CourseInstructorsService(repository as any);
  });

  describe('findViewByCourseId', () => {
    it('should split the rows into a primary and an ordered co-instructor list', async () => {
      repository.findByCourseId.mockResolvedValue([
        row('c1', 'ins-3', 'co_instructor', 2),
        row('c1', 'ins-1', 'primary', 0),
        row('c1', 'ins-2', 'co_instructor', 1),
      ]);

      const result = await service.findViewByCourseId('c1');

      expect(result.primaryInstructor).toEqual({
        id: 'ins-1',
        slug: 'slug-ins-1',
        fullName: 'Instructor ins-1',
        headline: null,
        profilePictureUrl: null,
      });
      expect(result.coInstructors.map((item) => item.id)).toEqual([
        'ins-2',
        'ins-3',
      ]);
    });

    it('should return a null primary for a course with no instructors', async () => {
      await expect(service.findViewByCourseId('c1')).resolves.toEqual({
        primaryInstructor: null,
        coInstructors: [],
      });
    });

    it('should treat a guest instructor as a co-instructor for display', async () => {
      repository.findByCourseId.mockResolvedValue([
        row('c1', 'ins-1', 'primary', 0),
        row('c1', 'ins-9', 'guest', 5),
      ]);

      const result = await service.findViewByCourseId('c1');

      expect(result.coInstructors.map((item) => item.id)).toEqual(['ins-9']);
    });
  });

  describe('findViewByCourseIds', () => {
    it('should group a page of courses from a single lookup', async () => {
      repository.findByCourseIds.mockResolvedValue([
        row('c1', 'ins-1', 'primary', 0),
        row('c1', 'ins-2', 'co_instructor', 1),
        row('c2', 'ins-3', 'primary', 0),
      ]);

      const result = await service.findViewByCourseIds(['c1', 'c2', 'c3']);

      expect(repository.findByCourseIds).toHaveBeenCalledTimes(1);
      expect(result.get('c1')?.primaryInstructor?.id).toBe('ins-1');
      expect(result.get('c1')?.coInstructors).toHaveLength(1);
      expect(result.get('c2')?.primaryInstructor?.id).toBe('ins-3');
      // Every requested id is present, even when the course has no rows.
      expect(result.get('c3')).toEqual({
        primaryInstructor: null,
        coInstructors: [],
      });
    });
  });
});
