import { describe, expect, it, beforeEach, jest } from '@jest/globals';
import {
  ConflictException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { CourseEnrollmentService } from './course-enrollment.service';

describe('CourseEnrollmentService', () => {
  let service: CourseEnrollmentService;

  let coursesService: { findBySlug: jest.Mock<any>; update: jest.Mock<any> };
  let enrollmentsService: {
    findByStudentAndCourse: jest.Mock<any>;
    findByStudentId: jest.Mock<any>;
    create: jest.Mock<any>;
  };

  const openCourse = {
    id: 'course-1',
    slug: 'career-basics',
    title: 'Career Basics',
    thumbnailUrl: 'https://cdn/t.png',
    status: 'published',
    enrollmentOpen: true,
    totalEnrollments: 12,
  };

  beforeEach(() => {
    coursesService = { findBySlug: jest.fn(), update: jest.fn() };
    enrollmentsService = {
      findByStudentAndCourse: jest.fn(),
      findByStudentId: jest.fn(),
      create: jest.fn(),
    };

    coursesService.findBySlug.mockResolvedValue(openCourse);
    coursesService.update.mockResolvedValue(openCourse);
    enrollmentsService.findByStudentAndCourse.mockResolvedValue(null);
    enrollmentsService.create.mockResolvedValue({ id: 'enrollment-1' });

    service = new CourseEnrollmentService(
      coursesService as any,
      enrollmentsService as any,
    );
  });

  describe('enroll', () => {
    it('should create the enrollment and return its id', async () => {
      const result = await service.enroll('career-basics', 42);

      expect(result).toEqual({
        enrollmentId: 'enrollment-1',
        message: 'Enrollment successful',
      });
    });

    it('should record student, course, status, date and source', async () => {
      await service.enroll('career-basics', 42);

      expect(enrollmentsService.create).toHaveBeenCalledWith({
        student: { id: 42 },
        course: { id: 'course-1' },
        status: 'enrolled',
        enrollmentDate: expect.any(Date),
        enrollmentSource: 'organic',
        progressPct: 0,
      });
    });

    it('should increment the course enrollment counter', async () => {
      await service.enroll('career-basics', 42);

      expect(coursesService.update).toHaveBeenCalledWith('course-1', {
        totalEnrollments: 13,
      });
    });

    it('should start the counter at 1 when the course has no count yet', async () => {
      coursesService.findBySlug.mockResolvedValue({
        ...openCourse,
        totalEnrollments: undefined,
      });

      await service.enroll('career-basics', 42);

      expect(coursesService.update).toHaveBeenCalledWith('course-1', {
        totalEnrollments: 1,
      });
    });

    it('should 404 when the slug does not exist', async () => {
      coursesService.findBySlug.mockResolvedValue(null);

      await expect(service.enroll('missing', 42)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(enrollmentsService.create).not.toHaveBeenCalled();
    });

    it('should 404 when the course is not published', async () => {
      coursesService.findBySlug.mockResolvedValue({
        ...openCourse,
        status: 'draft',
      });

      await expect(service.enroll('career-basics', 42)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(enrollmentsService.create).not.toHaveBeenCalled();
    });

    it('should 422 when enrollment is closed on a published course', async () => {
      coursesService.findBySlug.mockResolvedValue({
        ...openCourse,
        enrollmentOpen: false,
      });

      await expect(service.enroll('career-basics', 42)).rejects.toBeInstanceOf(
        UnprocessableEntityException,
      );
      expect(enrollmentsService.create).not.toHaveBeenCalled();
    });

    it('should 409 ALREADY_ENROLLED on a duplicate enrollment', async () => {
      enrollmentsService.findByStudentAndCourse.mockResolvedValue({
        id: 'enrollment-existing',
        status: 'in_progress',
      });

      await expect(service.enroll('career-basics', 42)).rejects.toMatchObject({
        response: { code: 'ALREADY_ENROLLED' },
      });
      await expect(service.enroll('career-basics', 42)).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(enrollmentsService.create).not.toHaveBeenCalled();
    });

    it('should not bump the counter when the enrollment is rejected', async () => {
      enrollmentsService.findByStudentAndCourse.mockResolvedValue({
        id: 'enrollment-existing',
      });

      await expect(service.enroll('career-basics', 42)).rejects.toThrow();
      expect(coursesService.update).not.toHaveBeenCalled();
    });

    it('should scope the duplicate check to the calling student', async () => {
      await service.enroll('career-basics', 42);

      expect(enrollmentsService.findByStudentAndCourse).toHaveBeenCalledWith(
        42,
        'course-1',
      );
    });
  });

  describe('findMyCourses', () => {
    it('should map an enrollment to the My Courses card shape', async () => {
      const enrollmentDate = new Date('2026-01-05T00:00:00.000Z');
      enrollmentsService.findByStudentId.mockResolvedValue([
        {
          id: 'enrollment-1',
          course: openCourse,
          enrollmentDate,
          progressPct: 45.5,
          lastLecture: { id: 'lecture-9', title: 'Lesson 9' },
          lastAccessedAt: enrollmentDate,
          status: 'in_progress',
          completedAt: null,
        },
      ]);

      const result = await service.findMyCourses(42);

      expect(result).toEqual([
        {
          enrollmentId: 'enrollment-1',
          course: {
            id: 'course-1',
            title: 'Career Basics',
            slug: 'career-basics',
            thumbnailUrl: 'https://cdn/t.png',
          },
          enrollmentDate,
          progressPct: 45.5,
          lastLectureId: 'lecture-9',
          lastLectureTitle: 'Lesson 9',
          lastAccessedAt: enrollmentDate,
          status: 'in_progress',
          completedAt: null,
        },
      ]);
    });

    it('should null the last-lecture fields for a not-yet-started enrollment', async () => {
      enrollmentsService.findByStudentId.mockResolvedValue([
        {
          id: 'enrollment-2',
          course: openCourse,
          status: 'enrolled',
        },
      ]);

      const [card] = await service.findMyCourses(42);

      expect(card.lastLectureId).toBeNull();
      expect(card.lastLectureTitle).toBeNull();
      expect(card.lastAccessedAt).toBeNull();
      expect(card.completedAt).toBeNull();
      expect(card.progressPct).toBe(0);
    });

    it('should return an empty list when the student has no enrollments', async () => {
      enrollmentsService.findByStudentId.mockResolvedValue([]);

      await expect(service.findMyCourses(42)).resolves.toEqual([]);
      expect(enrollmentsService.findByStudentId).toHaveBeenCalledWith(42);
    });
  });
});
