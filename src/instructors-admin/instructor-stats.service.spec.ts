import { describe, expect, it, beforeEach, jest } from '@jest/globals';
import { NotFoundException } from '@nestjs/common';
import { InstructorStatsService } from './instructor-stats.service';

describe('InstructorStatsService', () => {
  let service: InstructorStatsService;

  let instructorsService: {
    findById: jest.Mock<any>;
    update: jest.Mock<any>;
  };
  let courseInstructorsService: { findByInstructorId: jest.Mock<any> };
  let enrollmentsService: { countDistinctStudentsByCourseIds: jest.Mock<any> };

  const assignment = (
    id: string,
    status: string,
    avgRating: number | null,
    totalEnrollments: number,
  ) => ({
    role: 'primary',
    course: { id, status, avgRating, totalEnrollments },
  });

  beforeEach(() => {
    instructorsService = { findById: jest.fn(), update: jest.fn() };
    courseInstructorsService = { findByInstructorId: jest.fn() };
    enrollmentsService = { countDistinctStudentsByCourseIds: jest.fn() };

    instructorsService.findById.mockResolvedValue({ id: 'ins-1' });
    courseInstructorsService.findByInstructorId.mockResolvedValue([]);
    enrollmentsService.countDistinctStudentsByCourseIds.mockResolvedValue(0);

    service = new InstructorStatsService(
      instructorsService as any,
      courseInstructorsService as any,
      enrollmentsService as any,
    );
  });

  it('should 404 for an unknown instructor', async () => {
    instructorsService.findById.mockResolvedValue(null);

    await expect(service.recompute('missing')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('should count every assignment, published or not, as a course', async () => {
    courseInstructorsService.findByInstructorId.mockResolvedValue([
      assignment('c1', 'published', 5, 10),
      assignment('c2', 'draft', null, 0),
    ]);

    const stats = await service.recompute('ins-1');

    expect(stats.totalCourses).toBe(2);
    expect(stats.publishedCourses).toBe(1);
  });

  it('should count distinct students across every assigned course', async () => {
    courseInstructorsService.findByInstructorId.mockResolvedValue([
      assignment('c1', 'published', 5, 10),
      assignment('c2', 'published', 4, 8),
    ]);
    enrollmentsService.countDistinctStudentsByCourseIds.mockResolvedValue(15);

    const stats = await service.recompute('ins-1');

    expect(
      enrollmentsService.countDistinctStudentsByCourseIds,
    ).toHaveBeenCalledWith(['c1', 'c2']);
    expect(stats.totalStudents).toBe(15);
  });

  it('should weight avgRating by enrollments across published courses only', async () => {
    courseInstructorsService.findByInstructorId.mockResolvedValue([
      assignment('c1', 'published', 5, 30),
      assignment('c2', 'published', 4, 10),
      // Draft courses must not drag the average.
      assignment('c3', 'draft', 1, 100),
    ]);

    const stats = await service.recompute('ins-1');

    // (5*30 + 4*10) / 40 = 4.75
    expect(stats.avgRating).toBe(4.75);
  });

  it('should fall back to a plain mean when the published courses have no enrollments', async () => {
    courseInstructorsService.findByInstructorId.mockResolvedValue([
      assignment('c1', 'published', 5, 0),
      assignment('c2', 'published', 4, 0),
    ]);

    const stats = await service.recompute('ins-1');

    expect(stats.avgRating).toBe(4.5);
  });

  it('should report a null avgRating when no published course has been rated', async () => {
    courseInstructorsService.findByInstructorId.mockResolvedValue([
      assignment('c1', 'published', null, 10),
      assignment('c2', 'draft', 5, 10),
    ]);

    const stats = await service.recompute('ins-1');

    expect(stats.avgRating).toBeNull();
  });

  it('should round avgRating to the 2 decimals the column stores', async () => {
    courseInstructorsService.findByInstructorId.mockResolvedValue([
      assignment('c1', 'published', 4, 1),
      assignment('c2', 'published', 5, 2),
    ]);

    // 14/3 = 4.6666… → 4.67
    await expect(service.recompute('ins-1')).resolves.toMatchObject({
      avgRating: 4.67,
    });
  });

  it('should write the freshly computed counters back onto the instructor row', async () => {
    courseInstructorsService.findByInstructorId.mockResolvedValue([
      assignment('c1', 'published', 5, 10),
    ]);
    enrollmentsService.countDistinctStudentsByCourseIds.mockResolvedValue(9);

    await service.recompute('ins-1');

    expect(instructorsService.update).toHaveBeenCalledWith('ins-1', {
      totalCourses: 1,
      totalStudents: 9,
      avgRating: 5,
    });
  });

  it('should zero the counters for an instructor with no assignments', async () => {
    const stats = await service.recompute('ins-1');

    expect(stats).toMatchObject({
      totalCourses: 0,
      publishedCourses: 0,
      totalStudents: 0,
      avgRating: null,
    });
    expect(
      enrollmentsService.countDistinctStudentsByCourseIds,
    ).not.toHaveBeenCalled();
  });

  it('should recompute each affected instructor exactly once', async () => {
    await service.recomputeMany(['ins-1', 'ins-2', 'ins-1']);

    expect(instructorsService.findById).toHaveBeenCalledTimes(2);
  });

  it('should skip an instructor that has since been deleted instead of failing the batch', async () => {
    instructorsService.findById.mockImplementation((id: string) =>
      Promise.resolve(id === 'ins-1' ? { id } : null),
    );

    await expect(
      service.recomputeMany(['ins-1', 'gone']),
    ).resolves.toBeUndefined();
    expect(instructorsService.update).toHaveBeenCalledTimes(1);
  });
});
