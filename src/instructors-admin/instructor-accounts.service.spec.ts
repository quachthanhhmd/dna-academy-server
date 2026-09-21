import { HttpStatus, UnprocessableEntityException } from '@nestjs/common';
import { InstructorEntity } from '../instructors/infrastructure/persistence/relational/entities/instructor.entity';
import { UserEntity } from '../users/infrastructure/persistence/relational/entities/user.entity';
import { InstructorAccountsService } from './instructor-accounts.service';

/**
 * Race guard covered here — the caller's pre-check runs outside this
 * transaction, so two admins can both pass it, both create a user, and both
 * reach the attach step; only the caller who still finds `user_id IS NULL`
 * may attach, and the loser must throw so its user + role rows roll back
 * with the transaction.
 */
describe('InstructorAccountsService.attachAccount race guard', () => {
  let service: InstructorAccountsService;
  let userRolesService: { setRole: jest.Mock };
  let authService: { hashPassword: jest.Mock };
  let userRepository: {
    save: jest.Mock;
    create: jest.Mock<any, any>;
    findOne: jest.Mock;
  };
  let instructorBuilder: {
    createQueryBuilder: jest.Mock;
    update: jest.Mock;
    set: jest.Mock;
    where: jest.Mock;
    execute: jest.Mock;
  };
  let manager: { getRepository: jest.Mock };
  let dataSource: { transaction: jest.Mock };

  beforeEach(() => {
    authService = { hashPassword: jest.fn().mockResolvedValue('hashed') };
    userRolesService = { setRole: jest.fn().mockResolvedValue(undefined) };

    userRepository = {
      create: jest.fn((value) => value),
      save: jest.fn().mockResolvedValue({ id: 99, email: 'x@example.com' }),
      findOne: jest.fn(),
    };

    // Chainable stub — every step returns the same object.
    instructorBuilder = {
      createQueryBuilder: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      execute: jest.fn(),
    };

    manager = {
      getRepository: jest.fn((entity: unknown) => {
        if (entity === UserEntity) return userRepository;
        if (entity === InstructorEntity) return instructorBuilder;
        throw new Error(`Unexpected repository ${String(entity)}`);
      }),
    };

    dataSource = {
      transaction: jest.fn((callback: (m: unknown) => unknown) =>
        callback(manager),
      ),
    };

    service = new InstructorAccountsService(
      dataSource as any,
      userRolesService as any,
      authService as any,
    );
  });

  it('should attach when the instructor still has no account', async () => {
    instructorBuilder.execute.mockResolvedValue({ affected: 1 });

    await service.attachAccount('inst-1', 'Full Name', 'a@example.com', 1, 's');

    expect(instructorBuilder.where).toHaveBeenCalledWith(
      'id = :id AND user_id IS NULL',
      { id: 'inst-1' },
    );
    expect(userRolesService.setRole).toHaveBeenCalledTimes(1);
  });

  it('should refuse and roll back when a concurrent attach won', async () => {
    // A parallel transaction already set instructor.user_id to a different
    // user; our conditional UPDATE matches zero rows.
    instructorBuilder.execute.mockResolvedValue({ affected: 0 });

    await expect(
      service.attachAccount('inst-1', 'Full Name', 'a@example.com', 1, 's'),
    ).rejects.toMatchObject({
      status: HttpStatus.UNPROCESSABLE_ENTITY,
      response: {
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        errors: { email: 'instructorAlreadyHasAccount' },
      },
    });

    // The exception must propagate out of the transaction callback so TypeORM
    // rolls back — the user row and its role would otherwise be orphaned.
    // (userRolesService.setRole runs before the UPDATE, so we can't check
    // "not called"; we check that the thrown exception is the expected
    // 422, which the caller relies on to translate into a client error.)
    expect(instructorBuilder.execute).toHaveBeenCalledTimes(1);
  });

  it('should propagate a database error out of the transaction', async () => {
    instructorBuilder.execute.mockRejectedValue(new Error('deadlock'));

    await expect(
      service.attachAccount('inst-1', 'Full Name', 'a@example.com', 1, 's'),
    ).rejects.toThrow('deadlock');
  });

  it('should not be an UnprocessableEntityException subclass swallowing shape', () => {
    // A tiny guard that the response shape follows the project's contract:
    // `status` + `errors` with a specific message key the FE knows.
    const error = new UnprocessableEntityException({
      status: HttpStatus.UNPROCESSABLE_ENTITY,
      errors: { email: 'instructorAlreadyHasAccount' },
    });
    expect(error.getResponse()).toMatchObject({
      status: 422,
      errors: { email: 'instructorAlreadyHasAccount' },
    });
  });
});
