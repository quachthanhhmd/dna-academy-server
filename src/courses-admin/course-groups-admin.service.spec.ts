import { describe, expect, it, beforeEach, jest } from '@jest/globals';
import {
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { CourseGroupsAdminService } from './course-groups-admin.service';

describe('CourseGroupsAdminService', () => {
  let service: CourseGroupsAdminService;

  let coursesService: { findById: jest.Mock<any> };
  let masterDataCodesService: { findById: jest.Mock<any> };
  let courseGroupAssignmentsService: {
    removeByCourseId: jest.Mock<any>;
    create: jest.Mock<any>;
    findByCourseId: jest.Mock<any>;
  };

  const groupCode = (id: string) => ({
    id,
    isActive: true,
    group: { groupKey: 'course_group' },
  });

  beforeEach(() => {
    coursesService = { findById: jest.fn() };
    masterDataCodesService = { findById: jest.fn() };
    courseGroupAssignmentsService = {
      removeByCourseId: jest.fn(),
      create: jest.fn(),
      findByCourseId: jest.fn(),
    };

    service = new CourseGroupsAdminService(
      coursesService as any,
      masterDataCodesService as any,
      courseGroupAssignmentsService as any,
    );
  });

  it('should 404 when the course does not exist', async () => {
    coursesService.findById.mockResolvedValue(null);

    await expect(
      service.replaceGroups('missing', ['group-1']),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('should 422 when a groupId does not exist', async () => {
    coursesService.findById.mockResolvedValue({ id: 'course-1' });
    masterDataCodesService.findById.mockResolvedValue(null);

    await expect(
      service.replaceGroups('course-1', ['unknown']),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
    expect(
      courseGroupAssignmentsService.removeByCourseId,
    ).not.toHaveBeenCalled();
  });

  it('should 422 when a groupId belongs to a different master-data group', async () => {
    coursesService.findById.mockResolvedValue({ id: 'course-1' });
    masterDataCodesService.findById.mockResolvedValue({
      id: 'wrong-group',
      isActive: true,
      group: { groupKey: 'course_level' },
    });

    await expect(
      service.replaceGroups('course-1', ['wrong-group']),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
  });

  it('should 422 when a groupId is inactive', async () => {
    coursesService.findById.mockResolvedValue({ id: 'course-1' });
    masterDataCodesService.findById.mockResolvedValue({
      ...groupCode('inactive-1'),
      isActive: false,
    });

    await expect(
      service.replaceGroups('course-1', ['inactive-1']),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
  });

  it('should replace all course_group_assignments with the validated groupIds', async () => {
    coursesService.findById.mockResolvedValue({ id: 'course-1' });
    masterDataCodesService.findById.mockImplementation((id: string) =>
      Promise.resolve(groupCode(id)),
    );
    courseGroupAssignmentsService.create.mockImplementation((data: any) =>
      Promise.resolve({ id: `assignment-${data.group.id}`, group: data.group }),
    );

    const result = await service.replaceGroups('course-1', [
      'group-1',
      'group-2',
    ]);

    expect(courseGroupAssignmentsService.removeByCourseId).toHaveBeenCalledWith(
      'course-1',
    );
    expect(courseGroupAssignmentsService.create).toHaveBeenCalledWith({
      course: { id: 'course-1' },
      group: groupCode('group-1'),
    });
    expect(courseGroupAssignmentsService.create).toHaveBeenCalledWith({
      course: { id: 'course-1' },
      group: groupCode('group-2'),
    });
    expect(result.map((r) => r.group.id)).toEqual(['group-1', 'group-2']);
  });

  it('should replace with an empty set when given no groupIds', async () => {
    coursesService.findById.mockResolvedValue({ id: 'course-1' });

    const result = await service.replaceGroups('course-1', []);

    expect(courseGroupAssignmentsService.removeByCourseId).toHaveBeenCalledWith(
      'course-1',
    );
    expect(courseGroupAssignmentsService.create).not.toHaveBeenCalled();
    expect(result).toEqual([]);
  });
});
