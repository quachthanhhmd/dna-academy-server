import { describe, expect, it, beforeEach, jest } from '@jest/globals';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { MasterDataAdminService } from './master-data-admin.service';

describe('MasterDataAdminService', () => {
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
  let coursesService: {
    countByLevelId: jest.Mock<any>;
    countByCategoryId: jest.Mock<any>;
  };
  let courseGroupAssignmentsService: { countByGroupId: jest.Mock<any> };

  beforeEach(() => {
    masterDataGroupsService = {
      findAllWithPagination: jest.fn(),
      findByGroupKey: jest.fn(),
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
