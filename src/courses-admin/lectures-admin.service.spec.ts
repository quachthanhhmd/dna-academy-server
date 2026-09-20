import { describe, expect, it, beforeEach, jest } from '@jest/globals';
import {
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { LecturesAdminService } from './lectures-admin.service';

describe('LecturesAdminService', () => {
  let service: LecturesAdminService;

  let coursesService: { findById: jest.Mock<any> };
  let sectionsService: { findById: jest.Mock<any> };
  let lecturesService: {
    create: jest.Mock<any>;
    findById: jest.Mock<any>;
    findBySectionId: jest.Mock<any>;
    update: jest.Mock<any>;
    remove: jest.Mock<any>;
    hasLearnerData: jest.Mock<any>;
  };
  let courseAggregatesService: { recalculate: jest.Mock<any> };
  let lectureContentAdminService: { clearAllContent: jest.Mock<any> };
  let enrollmentsService: { clearLastLecture: jest.Mock<any> };

  const course = { id: 'course-1' };
  const section = { id: 'section-1', course: { id: 'course-1' } };

  beforeEach(() => {
    coursesService = { findById: jest.fn() };
    sectionsService = { findById: jest.fn() };
    lecturesService = {
      create: jest.fn(),
      findById: jest.fn(),
      findBySectionId: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
      hasLearnerData: (jest.fn() as jest.Mock<any>).mockResolvedValue(false),
    };
    courseAggregatesService = { recalculate: jest.fn() };
    lectureContentAdminService = { clearAllContent: jest.fn() };
    enrollmentsService = { clearLastLecture: jest.fn() };

    service = new LecturesAdminService(
      coursesService as any,
      sectionsService as any,
      lecturesService as any,
      courseAggregatesService as any,
      lectureContentAdminService as any,
      enrollmentsService as any,
    );
  });

  describe('create', () => {
    it('should 404 when the section does not belong to the course', async () => {
      coursesService.findById.mockResolvedValue(course);
      sectionsService.findById.mockResolvedValue({
        id: 'section-1',
        course: { id: 'other-course' },
      });

      await expect(
        service.create('course-1', 'section-1', {
          title: 'X',
          lectureType: 'article',
          durationSecs: 10,
          isPreview: false,
          requiresCompletion: true,
          displayOrder: 1,
        } as any),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('should create the lecture under the section and recalculate aggregates', async () => {
      coursesService.findById.mockResolvedValue(course);
      sectionsService.findById.mockResolvedValue(section);
      lecturesService.create.mockResolvedValue({ id: 'lecture-1' });

      await service.create('course-1', 'section-1', {
        title: 'Lecture 1',
        lectureType: 'article',
        durationSecs: 90,
        isPreview: false,
        requiresCompletion: true,
        displayOrder: 1,
      } as any);

      expect(lecturesService.create).toHaveBeenCalledWith({
        section: { id: 'section-1' },
        title: 'Lecture 1',
        description: undefined,
        lectureType: 'article',
        durationSecs: 90,
        isPreview: false,
        requiresCompletion: true,
        displayOrder: 1,
        status: 'draft',
      });
      expect(courseAggregatesService.recalculate).toHaveBeenCalledWith(
        'course-1',
      );
    });
  });

  describe('update', () => {
    it('should 404 when the lecture does not belong to the section/course', async () => {
      coursesService.findById.mockResolvedValue(course);
      sectionsService.findById.mockResolvedValue(section);
      lecturesService.findById.mockResolvedValue({
        id: 'lecture-1',
        section: { id: 'other-section' },
      });

      await expect(
        service.update('course-1', 'section-1', 'lecture-1', {
          title: 'X',
        } as any),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('should update the lecture and recalculate aggregates', async () => {
      coursesService.findById.mockResolvedValue(course);
      sectionsService.findById.mockResolvedValue(section);
      lecturesService.findById.mockResolvedValue({
        id: 'lecture-1',
        section: { id: 'section-1' },
      });
      lecturesService.update.mockResolvedValue({ id: 'lecture-1' });

      await service.update('course-1', 'section-1', 'lecture-1', {
        durationSecs: 200,
      } as any);

      expect(lecturesService.update).toHaveBeenCalledWith('lecture-1', {
        durationSecs: 200,
      });
      expect(courseAggregatesService.recalculate).toHaveBeenCalledWith(
        'course-1',
      );
    });
  });

  describe('remove', () => {
    it('should delete the lecture and recalculate aggregates', async () => {
      coursesService.findById.mockResolvedValue(course);
      sectionsService.findById.mockResolvedValue(section);
      lecturesService.findById.mockResolvedValue({
        id: 'lecture-1',
        section: { id: 'section-1' },
      });

      await service.remove('course-1', 'section-1', 'lecture-1');

      expect(lecturesService.remove).toHaveBeenCalledWith('lecture-1');
      expect(courseAggregatesService.recalculate).toHaveBeenCalledWith(
        'course-1',
      );
    });
  });

  describe('reorder', () => {
    it('should 422 when orderedIds does not exactly match the section lectures', async () => {
      coursesService.findById.mockResolvedValue(course);
      sectionsService.findById.mockResolvedValue(section);
      lecturesService.findBySectionId.mockResolvedValue([
        { id: 'lecture-1' },
        { id: 'lecture-2' },
      ]);

      await expect(
        service.reorder('course-1', 'section-1', ['lecture-1']),
      ).rejects.toBeInstanceOf(UnprocessableEntityException);
    });

    it('should set displayOrder by array position and recalculate aggregates', async () => {
      coursesService.findById.mockResolvedValue(course);
      sectionsService.findById.mockResolvedValue(section);
      lecturesService.findBySectionId.mockResolvedValue([
        { id: 'lecture-1' },
        { id: 'lecture-2' },
      ]);

      await service.reorder('course-1', 'section-1', [
        'lecture-2',
        'lecture-1',
      ]);

      expect(lecturesService.update).toHaveBeenNthCalledWith(1, 'lecture-2', {
        displayOrder: 1,
      });
      expect(lecturesService.update).toHaveBeenNthCalledWith(2, 'lecture-1', {
        displayOrder: 2,
      });
      expect(courseAggregatesService.recalculate).toHaveBeenCalledWith(
        'course-1',
      );
    });
  });

  describe('move', () => {
    it('should 404 when the lecture does not belong to the course', async () => {
      coursesService.findById.mockResolvedValue(course);
      lecturesService.findById.mockResolvedValue({
        id: 'lecture-1',
        section: { id: 'section-1', course: { id: 'other-course' } },
      });

      await expect(
        service.move('course-1', 'lecture-1', 'section-2', 1),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('should 422 when the target section does not belong to the course', async () => {
      coursesService.findById.mockResolvedValue(course);
      lecturesService.findById.mockResolvedValue({
        id: 'lecture-1',
        section: { id: 'section-1', course: { id: 'course-1' } },
      });
      sectionsService.findById.mockResolvedValue({
        id: 'section-2',
        course: { id: 'other-course' },
      });

      await expect(
        service.move('course-1', 'lecture-1', 'section-2', 1),
      ).rejects.toBeInstanceOf(UnprocessableEntityException);
    });

    it('should move the lecture to the target section with the given displayOrder', async () => {
      coursesService.findById.mockResolvedValue(course);
      lecturesService.findById.mockResolvedValue({
        id: 'lecture-1',
        section: { id: 'section-1', course: { id: 'course-1' } },
      });
      sectionsService.findById.mockResolvedValue({
        id: 'section-2',
        course: { id: 'course-1' },
      });
      lecturesService.update.mockResolvedValue({ id: 'lecture-1' });

      await service.move('course-1', 'lecture-1', 'section-2', 3);

      expect(lecturesService.update).toHaveBeenCalledWith('lecture-1', {
        section: { id: 'section-2' },
        displayOrder: 3,
      });
      expect(courseAggregatesService.recalculate).toHaveBeenCalledWith(
        'course-1',
      );
    });
  });

  /**
   * Epic 4.2 §3.4 — BUG-09. All 22 lectures of the imported MIT course showed
   * `1:15:00` because the value was typed once by the import script. YouTube
   * oEmbed does not return duration, so there is nowhere to read it from — but
   * a zero is at least visibly wrong rather than plausibly wrong, and a video
   * that claims to last no time is never right.
   */
  describe('video duration guard (BUG-09)', () => {
    const base = {
      title: 'Lecture',
      lectureType: 'video',
      durationSecs: 600,
      isPreview: false,
      requiresCompletion: true,
      displayOrder: 1,
    };

    beforeEach(() => {
      coursesService.findById.mockResolvedValue(course);
      sectionsService.findById.mockResolvedValue(section);
      lecturesService.create.mockResolvedValue({ id: 'lecture-1' });
      lecturesService.update.mockResolvedValue({ id: 'lecture-1' });
      lecturesService.findBySectionId.mockResolvedValue([
        { id: 'lecture-1', lectureType: 'video', durationSecs: 600 },
      ]);
      lecturesService.findById.mockResolvedValue({
        id: 'lecture-1',
        lectureType: 'video',
        durationSecs: 600,
        section: { id: 'section-1' },
      });
    });

    it('should accept a video with a real duration', async () => {
      await expect(
        service.create('course-1', 'section-1', base as never),
      ).resolves.toBeDefined();
    });

    it('should reject a video with zero duration', async () => {
      await expect(
        service.create('course-1', 'section-1', {
          ...base,
          durationSecs: 0,
        } as never),
      ).rejects.toMatchObject({
        response: { errors: { durationSecs: 'requiredForVideo' } },
      });

      expect(lecturesService.create).not.toHaveBeenCalled();
    });

    // A non-video lecture legitimately has no duration — a quiz is as long as
    // the student takes.
    it.each(['quiz', 'reflection', 'article', 'pdf_document'])(
      'should allow a %s lecture to have zero duration',
      async (lectureType) => {
        await expect(
          service.create('course-1', 'section-1', {
            ...base,
            lectureType,
            durationSecs: 0,
          } as never),
        ).resolves.toBeDefined();
      },
    );

    it('should reject a patch that zeroes a video duration', async () => {
      await expect(
        service.update('course-1', 'section-1', 'lecture-1', {
          durationSecs: 0,
        } as never),
      ).rejects.toBeInstanceOf(UnprocessableEntityException);

      expect(lecturesService.update).not.toHaveBeenCalled();
    });

    // The rule spans two fields, so a patch is judged on the row it produces.
    it('should reject a patch that switches a zero-duration lecture to video', async () => {
      lecturesService.findById.mockResolvedValue({
        id: 'lecture-1',
        lectureType: 'quiz',
        durationSecs: 0,
        section: { id: 'section-1' },
      });

      await expect(
        service.update('course-1', 'section-1', 'lecture-1', {
          lectureType: 'video',
        } as never),
      ).rejects.toBeInstanceOf(UnprocessableEntityException);
    });

    it('should allow a patch that switches a video to a quiz and drops the duration', async () => {
      await expect(
        service.update('course-1', 'section-1', 'lecture-1', {
          lectureType: 'quiz',
          durationSecs: 0,
        } as never),
      ).resolves.toBeDefined();
    });

    it('should leave an unrelated patch alone', async () => {
      await expect(
        service.update('course-1', 'section-1', 'lecture-1', {
          title: 'Renamed',
        } as never),
      ).resolves.toBeDefined();
    });
  });

  /*
    Every content table references `lecture`, so deleting the row first was a
    foreign-key violation that reached the client as a 500 — no quiz or
    article lecture could be removed at all.
  */
  describe('remove', () => {
    const lecture = { id: 'lec-1', section: { id: 'section-1' } };

    beforeEach(() => {
      coursesService.findById.mockResolvedValue(course);
      sectionsService.findById.mockResolvedValue(section);
      lecturesService.findById.mockResolvedValue(lecture);
    });

    it('should clear the content before deleting the lecture', async () => {
      const order: string[] = [];
      lectureContentAdminService.clearAllContent.mockImplementation(() => {
        order.push('content');
        return Promise.resolve();
      });
      lecturesService.remove.mockImplementation(() => {
        order.push('lecture');
        return Promise.resolve();
      });

      await service.remove('course-1', 'section-1', 'lec-1');

      expect(order).toEqual(['content', 'lecture']);
      expect(lectureContentAdminService.clearAllContent).toHaveBeenCalledWith(
        'lec-1',
      );
    });

    it('should release the Continue Learning pointer, which also references it', async () => {
      await service.remove('course-1', 'section-1', 'lec-1');

      expect(enrollmentsService.clearLastLecture).toHaveBeenCalledWith('lec-1');
    });

    it('should recalculate the course totals afterwards', async () => {
      await service.remove('course-1', 'section-1', 'lec-1');

      expect(courseAggregatesService.recalculate).toHaveBeenCalledWith(
        'course-1',
      );
    });

    it('should refuse a lecture students have worked on, with 409', async () => {
      lecturesService.hasLearnerData.mockResolvedValue(true);

      await expect(
        service.remove('course-1', 'section-1', 'lec-1'),
      ).rejects.toMatchObject({
        response: { status: 409, code: 'lectureHasLearnerData' },
      });
    });

    it('should leave everything alone when it refuses', async () => {
      lecturesService.hasLearnerData.mockResolvedValue(true);

      await service
        .remove('course-1', 'section-1', 'lec-1')
        .catch(() => undefined);

      expect(lectureContentAdminService.clearAllContent).not.toHaveBeenCalled();
      expect(lecturesService.remove).not.toHaveBeenCalled();
    });
  });

  describe('deleteLecturesOfSection', () => {
    it('should delete every lecture of the section through the same path', async () => {
      lecturesService.findBySectionId.mockResolvedValue([
        { id: 'lec-1' },
        { id: 'lec-2' },
      ]);

      await service.deleteLecturesOfSection('section-1');

      expect(lectureContentAdminService.clearAllContent).toHaveBeenCalledTimes(
        2,
      );
      expect(lecturesService.remove).toHaveBeenCalledTimes(2);
    });

    it('should refuse the whole section when one lecture has learner data', async () => {
      lecturesService.findBySectionId.mockResolvedValue([{ id: 'lec-1' }]);
      lecturesService.hasLearnerData.mockResolvedValue(true);

      await expect(
        service.deleteLecturesOfSection('section-1'),
      ).rejects.toMatchObject({
        response: { code: 'lectureHasLearnerData' },
      });
    });
  });
});
