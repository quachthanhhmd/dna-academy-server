import { describe, expect, it, beforeEach, jest } from '@jest/globals';
import {
  ConflictException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { MasterDataAdminService } from './master-data-admin.service';

/**
 * Epic 6 behaviour of the master data admin service: translation payloads,
 * default-locale enforcement, and translation coverage.
 */
describe('MasterDataAdminService — i18n', () => {
  let service: MasterDataAdminService;

  let masterDataGroupsService: {
    findAllWithPagination: jest.Mock<any>;
    findByGroupKey: jest.Mock<any>;
  };
  let masterDataCodesService: {
    findAllWithPagination: jest.Mock<any>;
    findById: jest.Mock<any>;
    findByGroupIdAndName: jest.Mock<any>;
    create: jest.Mock<any>;
    update: jest.Mock<any>;
  };

  const group = { id: 'group-1', groupKey: 'course_level' };

  beforeEach(() => {
    masterDataGroupsService = {
      findAllWithPagination: jest.fn(),
      findByGroupKey: (jest.fn() as jest.Mock<any>).mockResolvedValue(group),
    };
    masterDataCodesService = {
      findAllWithPagination: (jest.fn() as jest.Mock<any>).mockResolvedValue(
        [],
      ),
      findById: jest.fn(),
      findByGroupIdAndName: (jest.fn() as jest.Mock<any>).mockResolvedValue(
        null,
      ),
      create: (jest.fn() as jest.Mock<any>).mockResolvedValue({ id: 'code-1' }),
      update: (jest.fn() as jest.Mock<any>).mockResolvedValue({ id: 'code-1' }),
    };

    service = new MasterDataAdminService(
      masterDataGroupsService as any,
      masterDataCodesService as any,
      {
        countByLevelId: (jest.fn() as jest.Mock<any>).mockResolvedValue(0),
        countByCategoryId: (jest.fn() as jest.Mock<any>).mockResolvedValue(0),
      } as any,
      {
        countByGroupId: (jest.fn() as jest.Mock<any>).mockResolvedValue(0),
      } as any,
    );
  });

  describe('createCode', () => {
    it('should pass both translations through and derive name from vi', async () => {
      await service.createCode('course_level', {
        code: 'beginner',
        nameTranslations: { vi: 'Cơ bản', en: 'Beginner' },
        descriptionTranslations: { vi: 'Dành cho người mới' },
      } as any);

      expect(masterDataCodesService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'beginner',
          name: 'Cơ bản',
          nameTranslations: { vi: 'Cơ bản', en: 'Beginner' },
          descriptionTranslations: { vi: 'Dành cho người mới' },
        }),
      );
    });

    it('should accept a legacy name-only payload as the default locale', async () => {
      await service.createCode('course_level', {
        code: 'beginner',
        name: 'Cơ bản',
      } as any);

      expect(masterDataCodesService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Cơ bản',
          nameTranslations: { vi: 'Cơ bản' },
        }),
      );
    });

    it('should let an explicit vi translation win over the name shorthand', async () => {
      await service.createCode('course_level', {
        code: 'beginner',
        name: 'Ignored',
        nameTranslations: { vi: 'Cơ bản' },
      } as any);

      expect(masterDataCodesService.create).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Cơ bản' }),
      );
    });

    it('should 422 when no Vietnamese name can be derived', async () => {
      await expect(
        service.createCode('course_level', {
          code: 'beginner',
          nameTranslations: { en: 'Beginner' },
        } as any),
      ).rejects.toBeInstanceOf(UnprocessableEntityException);

      expect(masterDataCodesService.create).not.toHaveBeenCalled();
    });

    it('should check name uniqueness against the Vietnamese value', async () => {
      await service.createCode('course_level', {
        code: 'beginner',
        nameTranslations: { vi: 'Cơ bản', en: 'Beginner' },
      } as any);

      expect(masterDataCodesService.findByGroupIdAndName).toHaveBeenCalledWith(
        'group-1',
        'Cơ bản',
      );
    });
  });

  describe('updateCode', () => {
    const existing = {
      id: 'code-1',
      code: 'beginner',
      // `name` arrives localized from the mapper — under ?locale=en it is the
      // English value, which must never be used for the uniqueness check.
      name: 'Beginner',
      nameTranslations: { vi: 'Cơ bản', en: 'Beginner' },
      descriptionTranslations: {},
      group,
    };

    beforeEach(() => {
      masterDataCodesService.findById.mockResolvedValue(existing);
    });

    it('should merge a single-locale patch without dropping the others', async () => {
      await service.updateCode('course_level', 'code-1', {
        nameTranslations: { en: 'Novice' },
      } as any);

      expect(masterDataCodesService.update).toHaveBeenCalledWith(
        'code-1',
        expect.objectContaining({
          nameTranslations: { vi: 'Cơ bản', en: 'Novice' },
          name: 'Cơ bản',
        }),
      );
    });

    it('should not run a uniqueness check when the Vietnamese name is unchanged', async () => {
      await service.updateCode('course_level', 'code-1', {
        nameTranslations: { en: 'Novice' },
      } as any);

      expect(
        masterDataCodesService.findByGroupIdAndName,
      ).not.toHaveBeenCalled();
    });

    it('should 409 when renaming onto another code Vietnamese name', async () => {
      masterDataCodesService.findByGroupIdAndName.mockResolvedValue({
        id: 'code-2',
      });

      await expect(
        service.updateCode('course_level', 'code-1', {
          nameTranslations: { vi: 'Nâng cao' },
        } as any),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('should 422 when a patch would clear the Vietnamese name', async () => {
      await expect(
        service.updateCode('course_level', 'code-1', {
          nameTranslations: { vi: '' },
        } as any),
      ).rejects.toBeInstanceOf(UnprocessableEntityException);
    });

    it('should leave translations untouched when the key is omitted', async () => {
      await service.updateCode('course_level', 'code-1', {
        displayOrder: 7,
      } as any);

      const payload = masterDataCodesService.update.mock.calls[0][1] as Record<
        string,
        unknown
      >;
      expect(payload.displayOrder).toBe(7);
      expect('nameTranslations' in payload).toBe(false);
    });
  });

  describe('translationCoverage', () => {
    const codes = [
      { id: 'a', isActive: true, nameTranslations: { vi: 'A', en: 'A-en' } },
      { id: 'b', isActive: true, nameTranslations: { vi: 'B' } },
      { id: 'c', isActive: false, nameTranslations: { vi: 'C' } },
    ];

    it('should report per-locale coverage over active codes by default', async () => {
      masterDataCodesService.findAllWithPagination.mockResolvedValue(codes);

      const coverage = await service.translationCoverage('course_level', false);

      expect(coverage.en).toEqual({
        total: 2,
        translated: 1,
        missingIds: ['b'],
      });
    });

    it('should report the default locale as fully covered', async () => {
      masterDataCodesService.findAllWithPagination.mockResolvedValue(codes);

      const coverage = await service.translationCoverage('course_level', false);

      expect(coverage.vi).toEqual({
        total: 2,
        translated: 2,
        missingIds: [],
      });
    });

    it('should include inactive codes when asked', async () => {
      masterDataCodesService.findAllWithPagination.mockResolvedValue(codes);

      const coverage = await service.translationCoverage('course_level', true);

      expect(coverage.en.total).toBe(3);
      expect(coverage.en.missingIds).toEqual(['b', 'c']);
    });

    it('should 404 for an unknown group', async () => {
      masterDataGroupsService.findByGroupKey.mockResolvedValue(null);

      await expect(
        service.translationCoverage('nope', false),
      ).rejects.toMatchObject({ status: 404 });
    });
  });
});
