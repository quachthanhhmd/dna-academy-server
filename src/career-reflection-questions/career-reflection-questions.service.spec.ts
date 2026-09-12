import { describe, expect, it, beforeEach, jest } from '@jest/globals';
import { UnprocessableEntityException } from '@nestjs/common';
import { CareerReflectionQuestionsService } from './career-reflection-questions.service';

describe('CareerReflectionQuestionsService', () => {
  let service: CareerReflectionQuestionsService;
  let coursesService: Record<string, jest.Mock<any>>;
  let repository: Record<string, jest.Mock<any>>;

  const base = {
    isActive: true,
    displayOrder: 1,
    questionText: 'How useful was this course?',
  };

  beforeEach(() => {
    coursesService = {
      findById: (jest.fn() as jest.Mock<any>).mockResolvedValue({
        id: 'course-1',
      }),
    };
    repository = {
      create: (jest.fn() as jest.Mock<any>).mockResolvedValue({ id: 'q-1' }),
      findById: (jest.fn() as jest.Mock<any>).mockResolvedValue({
        id: 'q-1',
        questionType: 'slider',
        options: null,
      }),
      update: (jest.fn() as jest.Mock<any>).mockResolvedValue({ id: 'q-1' }),
    };

    service = new CareerReflectionQuestionsService(
      coursesService as never,
      repository as never,
    );
  });

  // Epic 4 v2 §2.1 added career_reflection_question.category; without it every
  // question falls into the "uncategorized" bucket of the grouped endpoint.
  it('should persist the category on create', async () => {
    await service.create({ ...base, category: 'overall_usefulness' } as never);

    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({ category: 'overall_usefulness' }),
    );
  });

  it('should store a null category when none is given', async () => {
    await service.create(base as never);

    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({ category: null }),
    );
  });

  it('should update the category', async () => {
    await service.update('q-1', { category: 'confidence' } as never);

    expect(repository.update).toHaveBeenCalledWith(
      'q-1',
      expect.objectContaining({ category: 'confidence' }),
    );
  });

  it('should leave the category alone when the patch omits it', async () => {
    await service.update('q-1', { displayOrder: 4 } as never);

    expect(repository.update).toHaveBeenCalledWith(
      'q-1',
      expect.objectContaining({ category: undefined }),
    );
  });

  it('should 422 an unknown course', async () => {
    coursesService.findById.mockResolvedValue(null);

    await expect(
      service.create({ ...base, course: { id: 'nope' } } as never),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
  });

  /**
   * Epic 4.1 §3.1 / D1 — the shape rule spans two fields, so a PATCH has to be
   * judged on the row it produces. The DB enforces the same thing; this exists
   * so an author gets a named field back instead of a constraint violation.
   */
  describe('question shape', () => {
    const options = [
      { value: 1, label: 'Cần luyện thêm' },
      { value: 2, label: 'Tốt' },
    ];

    it('should default an omitted type to slider', async () => {
      await service.create(base as never);

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({ questionType: 'slider', options: null }),
      );
    });

    it('should persist a radio with its options', async () => {
      await service.create({
        ...base,
        questionType: 'radio',
        options,
      } as never);

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({ questionType: 'radio', options }),
      );
    });

    it('should refuse a radio with no options', async () => {
      await expect(
        service.create({ ...base, questionType: 'radio' } as never),
      ).rejects.toMatchObject({
        response: { errors: { options: 'requiredForType' } },
      });

      expect(repository.create).not.toHaveBeenCalled();
    });

    it('should refuse a slider that carries options', async () => {
      await expect(
        service.create({ ...base, questionType: 'slider', options } as never),
      ).rejects.toMatchObject({
        response: { errors: { options: 'notAllowedForType' } },
      });
    });

    it('should persist the slider end labels and their translations', async () => {
      await service.create({
        ...base,
        labelMin: 'Không đồng ý',
        labelMax: 'Đồng ý',
        labelMinTranslations: { en: 'Disagree' },
        labelMaxTranslations: { en: 'Agree' },
      } as never);

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          labelMin: 'Không đồng ý',
          labelMax: 'Đồng ý',
          labelMinTranslations: { en: 'Disagree' },
          labelMaxTranslations: { en: 'Agree' },
        }),
      );
    });

    // The trap: a patch that names only the new type leaves a radio with no
    // options, which the DB would reject with a raw constraint error.
    it('should refuse a switch to radio that brings no options', async () => {
      await expect(
        service.update('q-1', { questionType: 'radio' } as never),
      ).rejects.toMatchObject({
        response: { errors: { options: 'requiredForType' } },
      });

      expect(repository.update).not.toHaveBeenCalled();
    });

    it('should allow a switch to radio that brings options', async () => {
      await service.update('q-1', {
        questionType: 'radio',
        options,
      } as never);

      expect(repository.update).toHaveBeenCalledWith(
        'q-1',
        expect.objectContaining({ questionType: 'radio', options }),
      );
    });

    it('should keep the stored options when a patch only renames the question', async () => {
      repository.findById.mockResolvedValue({
        id: 'q-1',
        questionType: 'radio',
        options,
      });

      await service.update('q-1', { questionText: 'New wording' } as never);

      expect(repository.update).toHaveBeenCalledWith(
        'q-1',
        expect.objectContaining({ questionType: 'radio', options }),
      );
    });

    it('should drop the options when switching back to a slider', async () => {
      repository.findById.mockResolvedValue({
        id: 'q-1',
        questionType: 'radio',
        options,
      });

      await service.update('q-1', { questionType: 'slider' } as never);

      expect(repository.update).toHaveBeenCalledWith(
        'q-1',
        expect.objectContaining({ questionType: 'slider', options: null }),
      );
    });

    it('should drop the end labels when switching away from a slider', async () => {
      await service.update('q-1', {
        questionType: 'select',
        options,
        labelMin: 'leftover',
      } as never);

      expect(repository.update).toHaveBeenCalledWith(
        'q-1',
        expect.objectContaining({ labelMin: null, labelMax: null }),
      );
    });

    it('should 422 a patch against a row that does not exist', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(
        service.update('missing', { questionText: 'x' } as never),
      ).rejects.toBeInstanceOf(UnprocessableEntityException);
    });
  });

  describe('deactivate', () => {
    it('should flip isActive rather than deleting the row', async () => {
      await service.deactivate('q-1');

      expect(repository.update).toHaveBeenCalledWith('q-1', {
        isActive: false,
      });
    });
  });
});
