import { describe, expect, it, beforeEach, jest } from '@jest/globals';
import {
  ConflictException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { CareerReflectionQuestionsService } from './career-reflection-questions.service';

/** Epic 4.6 BE-6 — authoring the certificate-screen questions. */
describe('CareerReflectionQuestionsService', () => {
  let service: CareerReflectionQuestionsService;
  let coursesService: Record<string, jest.Mock<any>>;
  let repository: Record<string, jest.Mock<any>>;

  const options = [
    { key: 1, label: 'Chắc chắn', labelTranslations: { en: 'Definitely' } },
    { key: 2, label: 'Không phải lúc này' },
  ];

  const selection = {
    questionType: 'selection',
    questionText: 'Bạn có dự định chia sẻ?',
    isActive: true,
    displayOrder: 5,
    options,
  };

  const stored = (over: Record<string, unknown> = {}) => ({
    id: 'q-1',
    questionType: 'selection',
    questionText: 'Bạn có dự định chia sẻ?',
    options,
    ...over,
  });

  beforeEach(() => {
    coursesService = {
      findById: (jest.fn() as jest.Mock<any>).mockResolvedValue({
        id: 'course-1',
      }),
    };
    repository = {
      create: (jest.fn() as jest.Mock<any>).mockResolvedValue({ id: 'q-1' }),
      findById: (jest.fn() as jest.Mock<any>).mockResolvedValue(stored()),
      update: (jest.fn() as jest.Mock<any>).mockResolvedValue({ id: 'q-1' }),
      remove: (jest.fn() as jest.Mock<any>).mockResolvedValue(undefined),
      countAnswers: (jest.fn() as jest.Mock<any>).mockResolvedValue(0),
      answeredOptionKeys: (jest.fn() as jest.Mock<any>).mockResolvedValue([]),
    };

    service = new CareerReflectionQuestionsService(
      coursesService as never,
      repository as never,
    );
  });

  describe('create', () => {
    it('should persist a selection with its options and translations', async () => {
      await service.create({
        ...selection,
        questionTextTranslations: { en: 'Share?' },
      } as never);

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          questionType: 'selection',
          options,
          questionTextTranslations: { en: 'Share?' },
        }),
      );
    });

    it('should default isRequired to true, as every question on §1 is', async () => {
      await service.create(selection as never);

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({ isRequired: true }),
      );
    });

    it('should honour an explicit optional question', async () => {
      await service.create({ ...selection, isRequired: false } as never);

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({ isRequired: false }),
      );
    });

    it('should store a free_text question with null options', async () => {
      await service.create({
        questionType: 'free_text',
        questionText: 'Mục đích ban đầu?',
        isActive: true,
        displayOrder: 1,
      } as never);

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({ questionType: 'free_text', options: null }),
      );
    });

    it('should create a global question when no course is given', async () => {
      await service.create(selection as never);

      expect(coursesService.findById).not.toHaveBeenCalled();
    });

    it('should reject a course that does not exist', async () => {
      coursesService.findById.mockResolvedValue(null);

      await expect(
        service.create({ ...selection, course: { id: 'nope' } } as never),
      ).rejects.toBeInstanceOf(UnprocessableEntityException);
    });

    it('should refuse a selection with no options before touching the DB', async () => {
      await expect(
        service.create({ ...selection, options: undefined } as never),
      ).rejects.toBeInstanceOf(UnprocessableEntityException);
      expect(repository.create).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('should 404 a question that does not exist', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(
        service.update('missing', { questionText: 'x' } as never),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('should keep the stored options when a patch only renames the question', async () => {
      await service.update('q-1', { questionText: 'Đổi tên' } as never);

      expect(repository.update).toHaveBeenCalledWith(
        'q-1',
        expect.objectContaining({ questionText: 'Đổi tên', options }),
      );
    });

    it('should drop the options when switching an unanswered question to free_text', async () => {
      await service.update('q-1', { questionType: 'free_text' } as never);

      expect(repository.update).toHaveBeenCalledWith(
        'q-1',
        expect.objectContaining({ questionType: 'free_text', options: null }),
      );
    });

    it('should refuse a switch to selection that brings no options', async () => {
      repository.findById.mockResolvedValue(
        stored({ questionType: 'free_text', options: null }),
      );

      await expect(
        service.update('q-1', { questionType: 'selection' } as never),
      ).rejects.toBeInstanceOf(UnprocessableEntityException);
    });
  });

  describe('answers already given are never stranded', () => {
    it('should refuse to change the type of an answered question', async () => {
      repository.countAnswers.mockResolvedValue(12);

      await expect(
        service.update('q-1', { questionType: 'free_text' } as never),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(repository.update).not.toHaveBeenCalled();
    });

    it('should refuse to remove an option key that has answers', async () => {
      repository.answeredOptionKeys.mockResolvedValue([1, 2]);

      await expect(
        service.update('q-1', {
          options: [options[0], { key: 3, label: 'Mới' }],
        } as never),
      ).rejects.toMatchObject({
        response: { status: 409, errors: { options: 'optionKeyInUse:2' } },
      });
    });

    it('should allow removing an option key nobody chose', async () => {
      repository.answeredOptionKeys.mockResolvedValue([1]);

      await expect(
        service.update('q-1', {
          options: [options[0], { key: 3, label: 'Mới' }],
        } as never),
      ).resolves.toBeDefined();
    });

    it('should allow relabelling and reordering, because answers store the key', async () => {
      repository.answeredOptionKeys.mockResolvedValue([1, 2]);

      await expect(
        service.update('q-1', {
          options: [
            { key: 2, label: 'Để sau' },
            { key: 1, label: 'Chắc chắn rồi' },
          ],
        } as never),
      ).resolves.toBeDefined();
    });
  });

  describe('remove', () => {
    it('should delete a question nobody has answered', async () => {
      await service.remove('q-1');

      expect(repository.remove).toHaveBeenCalledWith('q-1');
    });

    it('should refuse to delete an answered question', async () => {
      repository.countAnswers.mockResolvedValue(1);

      await expect(service.remove('q-1')).rejects.toMatchObject({
        response: { status: 409, errors: { id: 'questionHasAnswers' } },
      });
      expect(repository.remove).not.toHaveBeenCalled();
    });

    it('should 404 a question that does not exist', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.remove('missing')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('deactivate', () => {
    it('should deactivate even an answered question', async () => {
      repository.countAnswers.mockResolvedValue(40);

      await service.deactivate('q-1');

      expect(repository.update).toHaveBeenCalledWith('q-1', {
        isActive: false,
      });
    });

    it('should 404 a question that does not exist', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.deactivate('missing')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });
});
