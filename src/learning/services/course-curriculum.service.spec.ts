import { describe, expect, it, beforeEach, jest } from '@jest/globals';
import { CourseCurriculumService } from './course-curriculum.service';

describe('CourseCurriculumService', () => {
  let service: CourseCurriculumService;
  let sectionsService: { findByCourseId: jest.Mock<any> };
  let lecturesService: { findBySectionId: jest.Mock<any> };

  const section = (id: string, displayOrder: number) => ({ id, displayOrder });
  const lecture = (
    id: string,
    displayOrder: number,
    requiresCompletion = true,
  ) => ({ id, displayOrder, requiresCompletion, title: `L-${id}` });

  beforeEach(() => {
    sectionsService = { findByCourseId: jest.fn() };
    lecturesService = { findBySectionId: jest.fn() };
    service = new CourseCurriculumService(
      sectionsService as any,
      lecturesService as any,
    );
  });

  it('should flatten sections and lectures into one ordered list', async () => {
    sectionsService.findByCourseId.mockResolvedValue([
      section('s2', 2),
      section('s1', 1),
    ]);
    lecturesService.findBySectionId.mockImplementation((id: string) =>
      Promise.resolve(
        id === 's1' ? [lecture('b', 2), lecture('a', 1)] : [lecture('c', 1)],
      ),
    );

    const ordered = await service.orderedLectures('course-1');

    expect(ordered.map((item) => item.id)).toEqual(['a', 'b', 'c']);
  });

  it('should attach the owning section to every lecture', async () => {
    sectionsService.findByCourseId.mockResolvedValue([section('s1', 1)]);
    lecturesService.findBySectionId.mockResolvedValue([lecture('a', 1)]);

    const [first] = await service.orderedLectures('course-1');

    expect(first.section.id).toBe('s1');
  });

  it('should return an empty list for a course with no sections', async () => {
    sectionsService.findByCourseId.mockResolvedValue([]);

    await expect(service.orderedLectures('course-1')).resolves.toEqual([]);
  });

  describe('neighbours', () => {
    const ordered = [{ id: 'a' }, { id: 'b' }, { id: 'c' }] as never[];

    it('should return null on both ends', () => {
      expect(CourseCurriculumService.neighbours(ordered, 'a')).toEqual({
        prevLectureId: null,
        nextLectureId: 'b',
      });
      expect(CourseCurriculumService.neighbours(ordered, 'c')).toEqual({
        prevLectureId: 'b',
        nextLectureId: null,
      });
    });

    it('should return both neighbours in the middle', () => {
      expect(CourseCurriculumService.neighbours(ordered, 'b')).toEqual({
        prevLectureId: 'a',
        nextLectureId: 'c',
      });
    });

    it('should return nulls for a lecture outside the course', () => {
      expect(CourseCurriculumService.neighbours(ordered, 'zzz')).toEqual({
        prevLectureId: null,
        nextLectureId: null,
      });
    });
  });
});
