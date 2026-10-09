import { describe, expect, it, beforeEach, jest } from '@jest/globals';
import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { UsersAdminService } from './users-admin.service';

/*
  Admin "delete" removes the user from the system. The foreign keys cascade
  (migration UserDeleteCascades1788300000000); what the service owns is the
  guard rails and the denormalised course counters, all in one transaction.
*/
describe('UsersAdminService.remove', () => {
  let service: UsersAdminService;
  let usersService: { findById: jest.Mock<any> };
  let authorizationService: { permissionsOf: jest.Mock<any> };
  let manager: { query: jest.Mock<any> };
  let dataSource: { transaction: jest.Mock<any> };

  beforeEach(() => {
    usersService = {
      findById: (jest.fn() as jest.Mock<any>).mockResolvedValue({ id: 7 }),
    };
    authorizationService = {
      permissionsOf: (jest.fn() as jest.Mock<any>).mockImplementation(
        (id: number) =>
          Promise.resolve(id === 1 ? ['users:delete', 'courses:view'] : []),
      ),
    };
    manager = {
      query: (jest.fn() as jest.Mock<any>).mockImplementation((sql: string) => {
        if (sql.includes('FROM enrollment')) {
          return Promise.resolve([
            { courseId: 'c1', count: 2 },
            { courseId: 'c2', count: 1 },
          ]);
        }
        if (sql.includes('FROM course_rating WHERE student_id')) {
          return Promise.resolve([{ courseId: 'c1' }]);
        }
        return Promise.resolve([]);
      }),
    };
    dataSource = {
      transaction: (jest.fn() as jest.Mock<any>).mockImplementation(
        (work: (m: typeof manager) => Promise<void>) => work(manager),
      ),
    };

    service = new UsersAdminService(
      usersService as any,
      {} as any,
      authorizationService as any,
      {} as any,
      dataSource as any,
    );
  });

  const sqls = () => manager.query.mock.calls.map(([sql]) => String(sql));

  it('should delete the user row itself, inside one transaction', async () => {
    await service.remove(1, 7);

    expect(dataSource.transaction).toHaveBeenCalledTimes(1);
    expect(manager.query).toHaveBeenCalledWith(
      'DELETE FROM "user" WHERE id = $1',
      [7],
    );
  });

  it('should take the learner’s enrollments off each course counter', async () => {
    await service.remove(1, 7);

    const decrements = manager.query.mock.calls.filter(([sql]) =>
      String(sql).includes('total_enrollments = GREATEST'),
    );
    expect(decrements.map(([, params]) => params)).toEqual([
      ['c1', 2],
      ['c2', 1],
    ]);
  });

  it('should recompute the average only for courses the learner rated', async () => {
    await service.remove(1, 7);

    const averages = manager.query.mock.calls.filter(([sql]) =>
      String(sql).includes('SET avg_rating'),
    );
    expect(averages.map(([, params]) => params)).toEqual([['c1']]);
  });

  it('should read the counters before the delete, while the rows still exist', async () => {
    await service.remove(1, 7);

    const order = sqls();
    const deleteAt = order.findIndex((sql) => sql.startsWith('DELETE FROM'));
    expect(
      order.findIndex((sql) => sql.includes('FROM enrollment')),
    ).toBeLessThan(deleteAt);
    expect(
      order.findIndex((sql) =>
        sql.includes('FROM course_rating WHERE student_id'),
      ),
    ).toBeLessThan(deleteAt);
  });

  it('should refuse to delete the caller’s own account', async () => {
    await expect(service.remove(7, 7)).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(dataSource.transaction).not.toHaveBeenCalled();
  });

  it('should 404 for a user that does not exist', async () => {
    usersService.findById.mockResolvedValue(null);

    await expect(service.remove(1, 99)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(dataSource.transaction).not.toHaveBeenCalled();
  });

  it('should refuse to delete someone who holds permissions the caller lacks', async () => {
    authorizationService.permissionsOf.mockImplementation((id: number) =>
      Promise.resolve(id === 1 ? ['users:delete'] : ['roles:manage']),
    );

    await expect(service.remove(1, 7)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(dataSource.transaction).not.toHaveBeenCalled();
  });
});
