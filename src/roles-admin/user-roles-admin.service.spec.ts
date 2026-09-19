import { describe, expect, it, beforeEach, jest } from '@jest/globals';
import { NotFoundException } from '@nestjs/common';
import { UserRolesAdminService } from './user-roles-admin.service';

describe('UserRolesAdminService', () => {
  let service: UserRolesAdminService;

  let usersService: { findById: jest.Mock<any> };
  let userRolesService: { findByUserId: jest.Mock<any> };

  beforeEach(() => {
    usersService = { findById: jest.fn() };
    userRolesService = { findByUserId: jest.fn() };

    service = new UserRolesAdminService(
      usersService as any,
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
});
