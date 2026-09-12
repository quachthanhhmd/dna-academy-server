import { describe, expect, it, beforeEach, jest } from '@jest/globals';
import { MasterDataAdminService } from './master-data-admin.service';

/**
 * The admin screens list a whole group at once — there is no paging control in
 * the UI. A cap smaller than a real group silently hides codes from the person
 * whose job is to manage them, and `course_level` has already outgrown 50 on a
 * working database.
 */
describe('MasterDataAdminService paging', () => {
  let service: MasterDataAdminService;
  let codesService: Record<string, jest.Mock<any>>;
  let groupsService: Record<string, jest.Mock<any>>;

  const limitOfLastCall = () => {
    const calls = codesService.findAllWithPagination.mock.calls;
    const [{ paginationOptions }] = calls[calls.length - 1] as [
      { paginationOptions: { limit: number } },
    ];
    return paginationOptions.limit;
  };

  beforeEach(() => {
    codesService = {
      findAllWithPagination: (jest.fn() as jest.Mock<any>).mockResolvedValue(
        [],
      ),
    };
    groupsService = {
      findAllWithPagination: (jest.fn() as jest.Mock<any>).mockResolvedValue(
        [],
      ),
      findByGroupKey: (jest.fn() as jest.Mock<any>).mockResolvedValue({
        id: 'g-1',
        groupKey: 'course_level',
      }),
    };

    service = new MasterDataAdminService(
      groupsService as never,
      codesService as never,
      { countByLevelId: jest.fn() } as never,
      { findByCodeId: jest.fn() } as never,
    );
  });

  it('should list every code in a group, not just the first page', async () => {
    await service.findCodesForGroup('course_level');

    expect(limitOfLastCall()).toBeGreaterThanOrEqual(1000);
  });

  it('should measure translation coverage over the whole group', async () => {
    await service.translationCoverage('course_level');

    expect(limitOfLastCall()).toBeGreaterThanOrEqual(1000);
  });

  it('should list every group', async () => {
    await service.findAllGroups();

    const [{ paginationOptions }] = groupsService.findAllWithPagination.mock
      .calls[0] as [{ paginationOptions: { limit: number } }];
    expect(paginationOptions.limit).toBeGreaterThanOrEqual(200);
  });
});
