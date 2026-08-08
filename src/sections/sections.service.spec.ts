import { describe, expect, it, beforeEach, jest } from '@jest/globals';
import { SectionsService } from './sections.service';

describe('SectionsService', () => {
  let service: SectionsService;

  let coursesService: { findById: jest.Mock<any> };
  let sectionRepository: { update: jest.Mock<any> };

  beforeEach(() => {
    coursesService = { findById: jest.fn() };
    sectionRepository = { update: jest.fn() };

    service = new SectionsService(
      coursesService as any,
      sectionRepository as any,
    );
  });

  it('should not pass undefined-valued fields through to the repository on a partial update', async () => {
    const dto = {
      course: undefined,
      displayOrder: undefined,
      learningObjective: undefined,
      description: undefined,
      title: 'Only this changes',
    };

    await service.update('section-1', dto as any);

    expect(sectionRepository.update).toHaveBeenCalledWith('section-1', {
      title: 'Only this changes',
    });
  });
});
