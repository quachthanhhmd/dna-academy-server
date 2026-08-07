import { describe, expect, it, beforeEach, jest } from '@jest/globals';
import {
  ConflictException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { RolesAdminService } from './roles-admin.service';

describe('RolesAdminService', () => {
  let service: RolesAdminService;

  let rolesService: {
    findAllWithPagination: jest.Mock<any>;
    findById: jest.Mock<any>;
    findByName: jest.Mock<any>;
    create: jest.Mock<any>;
    update: jest.Mock<any>;
    remove: jest.Mock<any>;
  };
  let userRolesService: { countByRoleId: jest.Mock<any> };
  let rolePermissionsService: {
    findByRoleId: jest.Mock<any>;
    removeByRoleId: jest.Mock<any>;
    create: jest.Mock<any>;
  };
  let permissionsService: {
    findAll: jest.Mock<any>;
    findByIds: jest.Mock<any>;
  };

  beforeEach(() => {
    rolesService = {
      findAllWithPagination: jest.fn(),
      findById: jest.fn(),
      findByName: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };
    userRolesService = { countByRoleId: jest.fn() };
    rolePermissionsService = {
      findByRoleId: jest.fn(),
      removeByRoleId: jest.fn(),
      create: jest.fn(),
    };
    permissionsService = { findAll: jest.fn(), findByIds: jest.fn() };

    service = new RolesAdminService(
      rolesService as any,
      userRolesService as any,
      rolePermissionsService as any,
      permissionsService as any,
    );
  });

  describe('findAllWithStats', () => {
    it('should attach assignedUsersCount per role', async () => {
      rolesService.findAllWithPagination.mockResolvedValue([
        { id: 1, name: 'Admin' },
        { id: 2, name: 'User' },
      ]);
      userRolesService.countByRoleId.mockImplementation((roleId: number) =>
        Promise.resolve(roleId === 1 ? 3 : 0),
      );

      const result = await service.findAllWithStats();

      expect(result).toEqual([
        { id: 1, name: 'Admin', assignedUsersCount: 3 },
        { id: 2, name: 'User', assignedUsersCount: 0 },
      ]);
    });
  });

  describe('create', () => {
    it('should reject a duplicate role name with 409', async () => {
      rolesService.findByName.mockResolvedValue({ id: 9, name: 'Editor' });

      await expect(
        service.create({ name: 'Editor' } as any),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(rolesService.create).not.toHaveBeenCalled();
    });

    it('should create the role when the name is unique', async () => {
      rolesService.findByName.mockResolvedValue(null);
      rolesService.create.mockResolvedValue({ id: 4, name: 'Editor' });

      const result = await service.create({
        name: 'Editor',
        description: 'Can edit content',
      } as any);

      expect(rolesService.create).toHaveBeenCalledWith({
        name: 'Editor',
        description: 'Can edit content',
        isActive: true,
      });
      expect(result).toEqual({ id: 4, name: 'Editor' });
    });
  });

  describe('update', () => {
    it('should 404 when the role does not exist', async () => {
      rolesService.findById.mockResolvedValue(null);

      await expect(
        service.update(99, { name: 'X' } as any),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('should 409 when renaming to a name already used by a different role', async () => {
      rolesService.findById.mockResolvedValue({ id: 1, name: 'Editor' });
      rolesService.findByName.mockResolvedValue({ id: 2, name: 'Viewer' });

      await expect(
        service.update(1, { name: 'Viewer' } as any),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(rolesService.update).not.toHaveBeenCalled();
    });

    it('should allow updating a role to keep its own current name', async () => {
      rolesService.findById.mockResolvedValue({ id: 1, name: 'Editor' });
      rolesService.findByName.mockResolvedValue({ id: 1, name: 'Editor' });
      rolesService.update.mockResolvedValue({
        id: 1,
        name: 'Editor',
        description: 'Updated',
      });

      const result = await service.update(1, {
        name: 'Editor',
        description: 'Updated',
      } as any);

      expect(rolesService.update).toHaveBeenCalledWith(1, {
        name: 'Editor',
        description: 'Updated',
      });
      expect(result.description).toBe('Updated');
    });
  });

  describe('remove', () => {
    it('should 404 when the role does not exist', async () => {
      rolesService.findById.mockResolvedValue(null);

      await expect(service.remove(99)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('should 409 ROLE_HAS_USERS when users are assigned to the role', async () => {
      rolesService.findById.mockResolvedValue({ id: 1, name: 'Editor' });
      userRolesService.countByRoleId.mockResolvedValue(2);

      await expect(service.remove(1)).rejects.toMatchObject({
        status: 409,
        response: expect.objectContaining({ code: 'ROLE_HAS_USERS' }),
      });
      expect(rolesService.remove).not.toHaveBeenCalled();
    });

    it('should cascade-delete role_permissions then the role when no users are assigned', async () => {
      rolesService.findById.mockResolvedValue({ id: 1, name: 'Editor' });
      userRolesService.countByRoleId.mockResolvedValue(0);

      await service.remove(1);

      expect(rolePermissionsService.removeByRoleId).toHaveBeenCalledWith(1);
      expect(rolesService.remove).toHaveBeenCalledWith(1);
    });
  });

  describe('getPermissions', () => {
    it('should 404 when the role does not exist', async () => {
      rolesService.findById.mockResolvedValue(null);

      await expect(service.getPermissions(99)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('should group permissions by module and mark isGranted from role_permissions', async () => {
      rolesService.findById.mockResolvedValue({ id: 1, name: 'Editor' });
      permissionsService.findAll.mockResolvedValue([
        {
          id: 'p-view',
          action: 'view',
          label: 'View',
          module: { id: 'm-roles', name: 'roles', label: 'Roles' },
        },
        {
          id: 'p-edit',
          action: 'edit',
          label: 'Edit',
          module: { id: 'm-roles', name: 'roles', label: 'Roles' },
        },
        {
          id: 'p-md-view',
          action: 'view',
          label: 'View',
          module: { id: 'm-md', name: 'master_data', label: 'Master Data' },
        },
      ]);
      rolePermissionsService.findByRoleId.mockResolvedValue([
        { permission: { id: 'p-view' } },
      ]);

      const result = await service.getPermissions(1);

      expect(result).toEqual([
        {
          module: { id: 'm-roles', name: 'roles', label: 'Roles' },
          permissions: [
            { id: 'p-view', action: 'view', label: 'View', isGranted: true },
            { id: 'p-edit', action: 'edit', label: 'Edit', isGranted: false },
          ],
        },
        {
          module: { id: 'm-md', name: 'master_data', label: 'Master Data' },
          permissions: [
            {
              id: 'p-md-view',
              action: 'view',
              label: 'View',
              isGranted: false,
            },
          ],
        },
      ]);
    });
  });

  describe('setPermissions', () => {
    it('should 404 when the role does not exist', async () => {
      rolesService.findById.mockResolvedValue(null);

      await expect(service.setPermissions(99, ['p-1'])).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('should 422 when a permissionId does not exist', async () => {
      rolesService.findById.mockResolvedValue({ id: 1 });
      permissionsService.findByIds.mockResolvedValue([{ id: 'p-1' }]);

      await expect(
        service.setPermissions(1, ['p-1', 'p-missing']),
      ).rejects.toBeInstanceOf(UnprocessableEntityException);
      expect(rolePermissionsService.removeByRoleId).not.toHaveBeenCalled();
    });

    it('should replace role_permissions with exactly the given permission ids', async () => {
      rolesService.findById.mockResolvedValue({ id: 1 });
      permissionsService.findByIds.mockResolvedValue([
        { id: 'p-1' },
        { id: 'p-2' },
      ]);
      permissionsService.findAll.mockResolvedValue([]);
      rolePermissionsService.findByRoleId.mockResolvedValue([]);

      await service.setPermissions(1, ['p-1', 'p-2']);

      expect(rolePermissionsService.removeByRoleId).toHaveBeenCalledWith(1);
      expect(rolePermissionsService.create).toHaveBeenCalledTimes(2);
      expect(rolePermissionsService.create).toHaveBeenCalledWith({
        role: { id: 1 },
        permission: { id: 'p-1' },
      });
      expect(rolePermissionsService.create).toHaveBeenCalledWith({
        role: { id: 1 },
        permission: { id: 'p-2' },
      });
    });
  });
});
