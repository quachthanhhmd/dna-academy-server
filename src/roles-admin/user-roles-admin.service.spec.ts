import { describe, expect, it, beforeEach, jest } from '@jest/globals';
import {
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { UserRolesAdminService } from './user-roles-admin.service';

describe('UserRolesAdminService', () => {
  let service: UserRolesAdminService;

  let usersService: { findById: jest.Mock<any> };
  let rolesService: { findByIds: jest.Mock<any> };
  let userRolesService: {
    findByUserId: jest.Mock<any>;
    removeByUserId: jest.Mock<any>;
    create: jest.Mock<any>;
  };

  beforeEach(() => {
    usersService = { findById: jest.fn() };
    rolesService = { findByIds: jest.fn() };
    userRolesService = {
      findByUserId: jest.fn(),
      removeByUserId: jest.fn(),
      create: jest.fn(),
    };

    service = new UserRolesAdminService(
      usersService as any,
      rolesService as any,
      userRolesService as any,
    );
  });

  describe('findRolesForUser', () => {
    it('should 404 when the user does not exist', async () => {
      usersService.findById.mockResolvedValue(null);

      await expect(service.findRolesForUser(99)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it("should return the user's assigned roles", async () => {
      usersService.findById.mockResolvedValue({ id: 1 });
      userRolesService.findByUserId.mockResolvedValue([
        { role: { id: 3, name: 'Super Admin' } },
        { role: { id: 5, name: 'Editor' } },
      ]);

      const result = await service.findRolesForUser(1);

      expect(result).toEqual([
        { id: 3, name: 'Super Admin' },
        { id: 5, name: 'Editor' },
      ]);
    });
  });

  describe('setRolesForUser', () => {
    it('should 404 when the user does not exist', async () => {
      usersService.findById.mockResolvedValue(null);

      await expect(service.setRolesForUser(99, [3], 1)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('should 422 when a roleId does not exist', async () => {
      usersService.findById.mockResolvedValue({ id: 1 });
      rolesService.findByIds.mockResolvedValue([{ id: 3 }]);

      await expect(
        service.setRolesForUser(1, [3, 999], 1),
      ).rejects.toBeInstanceOf(UnprocessableEntityException);
      expect(userRolesService.removeByUserId).not.toHaveBeenCalled();
    });

    it('should replace user_roles with exactly the given role ids', async () => {
      usersService.findById.mockResolvedValue({ id: 1 });
      rolesService.findByIds.mockResolvedValue([{ id: 3 }, { id: 5 }]);
      userRolesService.findByUserId.mockResolvedValue([
        { role: { id: 3 } },
        { role: { id: 5 } },
      ]);

      await service.setRolesForUser(1, [3, 5], 42);

      expect(userRolesService.removeByUserId).toHaveBeenCalledWith(1);
      expect(userRolesService.create).toHaveBeenCalledTimes(2);
      expect(userRolesService.create).toHaveBeenCalledWith({
        user: { id: 1 },
        role: { id: 3 },
        assignedBy: { id: 42 },
        assignedAt: expect.any(Date),
      });
      expect(userRolesService.create).toHaveBeenCalledWith({
        user: { id: 1 },
        role: { id: 5 },
        assignedBy: { id: 42 },
        assignedAt: expect.any(Date),
      });
    });
  });
});
