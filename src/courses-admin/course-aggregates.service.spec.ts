import { describe, expect, it, beforeEach, jest } from '@jest/globals';
import { CourseAggregatesService } from './course-aggregates.service';

describe('CourseAggregatesService', () => {
  let service: CourseAggregatesService;

  let sectionsService: { countByCourseId: jest.Mock<any> };
  let lecturesService: { getCourseAggregates: jest.Mock<any> };
  let coursesService: { update: jest.Mock<any> };

  beforeEach(() => {
    sectionsService = { countByCourseId: jest.fn() };
    lecturesService = { getCourseAggregates: jest.fn() };
    coursesService = { update: jest.fn() };

    service = new CourseAggregatesService(
      sectionsService as any,
      lecturesService as any,
      coursesService as any,
    );
  });

  it('should recompute totalSections/totalLectures/totalDurationSecs and write them to the course', async () => {
    sectionsService.countByCourseId.mockResolvedValue(3);
    lecturesService.getCourseAggregates.mockResolvedValue({
      totalLectures: 12,
      totalDurationSecs: 3600,
    });

    await service.recalculate('course-1');

    expect(sectionsService.countByCourseId).toHaveBeenCalledWith('course-1');
    expect(lecturesService.getCourseAggregates).toHaveBeenCalledWith(
      'course-1',
    );
    expect(coursesService.update).toHaveBeenCalledWith('course-1', {
      totalSections: 3,
      totalLectures: 12,
      totalDurationSecs: 3600,
    });
  });
});
