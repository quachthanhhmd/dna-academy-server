import { describe, expect, it, beforeEach, jest } from '@jest/globals';
import { UnprocessableEntityException } from '@nestjs/common';
import { UserRolesService } from './user-roles.service';

describe('UserRolesService.setRole', () => {
  let service: UserRolesService;
  let roles: { findById: jest.Mock<any> };
  let repository: { setRole: jest.Mock<any> };

  beforeEach(() => {
    roles = {
      findById: (jest.fn() as jest.Mock<any>).mockImplementation((id) =>
        Promise.resolve(
          [1, 2, 4].includes(id as number) ? { id, name: `role ${id}` } : null,
        ),
      ),
    };
    repository = {
      setRole: (jest.fn() as jest.Mock<any>).mockResolvedValue(undefined),
    };

    service = new UserRolesService(roles as never, repository as never);
  });

  it('should write the role through the single atomic writer', async () => {
    await service.setRole(42, 4, 1);

    expect(repository.setRole).toHaveBeenCalledWith(42, 4, 1, undefined);
  });

  it('should pass a caller transaction through to the writer', async () => {
    const manager = { marker: 'tx' };

    await service.setRole(42, 2, null, manager as never);

    expect(repository.setRole).toHaveBeenCalledWith(42, 2, null, manager);
  });

  // An unknown id would otherwise surface as a foreign-key 500.
  it('should reject a role that does not exist', async () => {
    const error = await service.setRole(42, 99, 1).catch((e) => e);

    expect(error).toBeInstanceOf(UnprocessableEntityException);
    expect(error.getResponse()).toEqual({
      status: 422,
      errors: { roleId: 'notExists' },
    });
  });

  it('should write nothing when the role does not exist', async () => {
    await service.setRole(42, 99, 1).catch(() => undefined);

    expect(repository.setRole).not.toHaveBeenCalled();
  });
});
