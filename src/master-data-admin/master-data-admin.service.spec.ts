import { describe, expect, it, beforeEach, jest } from '@jest/globals';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { MasterDataAdminService } from './master-data-admin.service';

describe('MasterDataAdminService', () => {
  let service: MasterDataAdminService;

  let masterDataGroupsService: {
    findAllWithPagination: jest.Mock<any>;
    findByGroupKey: jest.Mock<any>;
    create: jest.Mock<any>;
    update: jest.Mock<any>;
  };
  let masterDataCodesService: {
    findAllWithPagination: jest.Mock<any>;
    findById: jest.Mock<any>;
    findByGroupIdAndName: jest.Mock<any>;
    create: jest.Mock<any>;
    update: jest.Mock<any>;
  };
  let coursesService: {
    countByLevelId: jest.Mock<any>;
    countByCategoryId: jest.Mock<any>;
  };
  let courseGroupAssignmentsService: { countByGroupId: jest.Mock<any> };

  beforeEach(() => {
    masterDataGroupsService = {
      findAllWithPagination: jest.fn(),
      findByGroupKey: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    };
    masterDataCodesService = {
      findAllWithPagination: jest.fn(),
      findById: jest.fn(),
      findByGroupIdAndName: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    };
    coursesService = {
      countByLevelId: (jest.fn() as jest.Mock<any>).mockResolvedValue(0),
      countByCategoryId: (jest.fn() as jest.Mock<any>).mockResolvedValue(0),
    };
    courseGroupAssignmentsService = {
      countByGroupId: (jest.fn() as jest.Mock<any>).mockResolvedValue(0),
    };

    service = new MasterDataAdminService(
      masterDataGroupsService as any,
      masterDataCodesService as any,
      coursesService as any,
      courseGroupAssignmentsService as any,
    );
  });

  describe('createGroup', () => {
    it('should create a group with the vi name as its default name', async () => {
      masterDataGroupsService.findByGroupKey.mockResolvedValue(null);
      masterDataGroupsService.create.mockImplementation((data: any) =>
        Promise.resolve({ id: 'g-new', ...data }),
      );

      await service.createGroup({
        groupKey: 'learning_goal',
        nameTranslations: { vi: 'Mục tiêu', en: 'Goal' },
      });

      expect(masterDataGroupsService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          groupKey: 'learning_goal',
          name: 'Mục tiêu',
          nameTranslations: { vi: 'Mục tiêu', en: 'Goal' },
          isActive: true,
          displayOrder: 0,
        }),
      );
    });

    it('should 409 when the groupKey is taken', async () => {
      masterDataGroupsService.findByGroupKey.mockResolvedValue({ id: 'g1' });

      await expect(
        service.createGroup({ groupKey: 'course_level', name: 'Cấp độ' }),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(masterDataGroupsService.create).not.toHaveBeenCalled();
    });

    it('should 422 without a Vietnamese name', async () => {
      masterDataGroupsService.findByGroupKey.mockResolvedValue(null);

      await expect(
        service.createGroup({
          groupKey: 'learning_goal',
          nameTranslations: { en: 'Goal' },
        }),
      ).rejects.toMatchObject({ status: 422 });
    });
  });

  describe('updateGroup', () => {
    beforeEach(() => {
      masterDataGroupsService.findByGroupKey.mockResolvedValue({
        id: 'g1',
        groupKey: 'course_level',
        nameTranslations: { vi: 'Cấp độ', en: 'Level' },
        descriptionTranslations: {},
      });
      masterDataGroupsService.update.mockResolvedValue({ id: 'g1' });
    });

    it('should toggle isActive without touching the names', async () => {
      await service.updateGroup('course_level', { isActive: false });

      expect(masterDataGroupsService.update).toHaveBeenCalledWith('g1', {
        isActive: false,
      });
    });

    it('should merge a translation patch onto the stored map', async () => {
      await service.updateGroup('course_level', {
        nameTranslations: { en: 'Course level' },
      });

      expect(masterDataGroupsService.update).toHaveBeenCalledWith(
        'g1',
        expect.objectContaining({
          name: 'Cấp độ',
          nameTranslations: { vi: 'Cấp độ', en: 'Course level' },
        }),
      );
    });

    it('should 404 for an unknown groupKey', async () => {
      masterDataGroupsService.findByGroupKey.mockResolvedValue(null);

      await expect(
        service.updateGroup('nope', { isActive: false }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('translationCoverageByGroup', () => {
    const code = (
      id: string,
      groupKey: string,
      en?: string,
      isActive = true,
    ) => ({
      id,
      isActive,
      group: { groupKey },
      nameTranslations: en ? { vi: 'x', en } : { vi: 'x' },
    });

    beforeEach(() => {
      masterDataGroupsService.findAllWithPagination.mockResolvedValue([
        { groupKey: 'course_level' },
        { groupKey: 'expertise_area' },
        { groupKey: 'empty_group' },
      ]);
      masterDataCodesService.findAllWithPagination.mockResolvedValue([
        code('c1', 'course_level', 'Beginner'),
        code('c2', 'course_level'),
        code('c3', 'expertise_area', 'Data'),
      ]);
    });

    it('should answer for every group in one read of the codes', async () => {
      const result = await service.translationCoverageByGroup();

      expect(
        masterDataCodesService.findAllWithPagination,
      ).toHaveBeenCalledTimes(1);
      expect(result.course_level.en).toEqual({
        total: 2,
        translated: 1,
        missingIds: ['c2'],
      });
      expect(result.expertise_area.en).toEqual({
        total: 1,
        translated: 1,
        missingIds: [],
      });
    });

    it('should return zeros for a group that has no codes', async () => {
      const result = await service.translationCoverageByGroup();

      expect(result.empty_group.en).toEqual({
        total: 0,
        translated: 0,
        missingIds: [],
      });
    });

    it('should count active codes only unless asked otherwise', async () => {
      await service.translationCoverageByGroup();
      expect(
        masterDataCodesService.findAllWithPagination,
      ).toHaveBeenLastCalledWith(
        expect.objectContaining({ filterOptions: { isActive: true } }),
      );

      await service.translationCoverageByGroup(true);
      expect(
        masterDataCodesService.findAllWithPagination,
      ).toHaveBeenLastCalledWith(
        expect.objectContaining({ filterOptions: {} }),
      );
    });
  });

  describe('findCodesForGroup', () => {
    it('should 404 for an unknown groupKey', async () => {
      masterDataGroupsService.findByGroupKey.mockResolvedValue(null);

      await expect(
        service.findCodesForGroup('nonexistent'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('should sum level + category + course_group_assignment counts as linkedCoursesCount', async () => {
      masterDataGroupsService.findByGroupKey.mockResolvedValue({
        id: 'group-1',
        groupKey: 'course_level',
      });
      masterDataCodesService.findAllWithPagination.mockResolvedValue([
        { id: 'code-1', name: 'Beginner' },
        { id: 'code-2', name: 'Advanced' },
      ]);
      coursesService.countByLevelId.mockImplementation((id: string) =>
        Promise.resolve(id === 'code-1' ? 5 : 0),
      );
      coursesService.countByCategoryId.mockResolvedValue(0);
      courseGroupAssignmentsService.countByGroupId.mockResolvedValue(0);

      const result = await service.findCodesForGroup('course_level');

      expect(result).toEqual([
        { id: 'code-1', name: 'Beginner', linkedCoursesCount: 5 },
        { id: 'code-2', name: 'Advanced', linkedCoursesCount: 0 },
      ]);
    });
  });

  describe('createCode', () => {
    it('should 404 for an unknown groupKey', async () => {
      masterDataGroupsService.findByGroupKey.mockResolvedValue(null);

      await expect(
        service.createCode('nonexistent', { name: 'X', code: 'x' } as any),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('should 409 on a duplicate (group, name)', async () => {
      masterDataGroupsService.findByGroupKey.mockResolvedValue({
        id: 'group-1',
        groupKey: 'course_level',
      });
      masterDataCodesService.findByGroupIdAndName.mockResolvedValue({
        id: 'existing',
      });

      await expect(
        service.createCode('course_level', {
          name: 'Beginner',
          code: 'beginner',
        } as any),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(masterDataCodesService.create).not.toHaveBeenCalled();
    });

    it('should create the code under the resolved group', async () => {
      masterDataGroupsService.findByGroupKey.mockResolvedValue({
        id: 'group-1',
        groupKey: 'course_level',
      });
      masterDataCodesService.findByGroupIdAndName.mockResolvedValue(null);
      masterDataCodesService.create.mockResolvedValue({ id: 'code-1' });

      await service.createCode('course_level', {
        name: 'Beginner',
        code: 'beginner',
        displayOrder: 1,
        isActive: true,
      } as any);

      expect(masterDataCodesService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Beginner',
          code: 'beginner',
          group: { id: 'group-1', groupKey: 'course_level' },
        }),
      );
    });
  });

  describe('updateCode', () => {
    it('should 404 when the code does not belong to the resolved group', async () => {
      masterDataGroupsService.findByGroupKey.mockResolvedValue({
        id: 'group-1',
        groupKey: 'course_level',
      });
      masterDataCodesService.findById.mockResolvedValue({
        id: 'code-1',
        name: 'Beginner',
        group: { id: 'other-group' },
      });

      await expect(
        service.updateCode('course_level', 'code-1', {
          name: 'Renamed',
        } as any),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('should 409 when renaming to a name already used in the group', async () => {
      masterDataGroupsService.findByGroupKey.mockResolvedValue({
        id: 'group-1',
        groupKey: 'course_level',
      });
      masterDataCodesService.findById.mockResolvedValue({
        id: 'code-1',
        name: 'Beginner',
        group: { id: 'group-1' },
      });
      masterDataCodesService.findByGroupIdAndName.mockResolvedValue({
        id: 'code-2',
      });

      await expect(
        service.updateCode('course_level', 'code-1', {
          name: 'Advanced',
        } as any),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('deactivateCode', () => {
    it('should set isActive to false without touching other fields', async () => {
      masterDataGroupsService.findByGroupKey.mockResolvedValue({
        id: 'group-1',
        groupKey: 'course_level',
      });
      masterDataCodesService.findById.mockResolvedValue({
        id: 'code-1',
        name: 'Beginner',
        group: { id: 'group-1' },
      });

      await service.deactivateCode('course_level', 'code-1');

      expect(masterDataCodesService.update).toHaveBeenCalledWith('code-1', {
        isActive: false,
      });
    });
  });
});
