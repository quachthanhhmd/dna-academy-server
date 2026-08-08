import { describe, expect, it, beforeEach, jest } from '@jest/globals';
import { LecturesService } from './lectures.service';

describe('LecturesService', () => {
  let service: LecturesService;

  let sectionsService: { findById: jest.Mock<any> };
  let lectureRepository: { update: jest.Mock<any> };

  beforeEach(() => {
    sectionsService = { findById: jest.fn() };
    lectureRepository = { update: jest.fn() };

    service = new LecturesService(
      sectionsService as any,
      lectureRepository as any,
    );
  });

  it('should not pass undefined-valued fields through to the repository on a partial update', async () => {
    const dto = {
      section: undefined,
      status: undefined,
      displayOrder: undefined,
      requiresCompletion: undefined,
      isPreview: undefined,
      durationSecs: undefined,
      lectureType: undefined,
      description: undefined,
      title: 'Only this changes',
    };

    await service.update('lecture-1', dto as any);

    expect(lectureRepository.update).toHaveBeenCalledWith('lecture-1', {
      title: 'Only this changes',
    });
  });
});
