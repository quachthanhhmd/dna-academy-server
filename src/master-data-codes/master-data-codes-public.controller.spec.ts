import { describe, expect, it, beforeEach, jest } from '@jest/globals';
import { MasterDataCodesPublicController } from './master-data-codes-public.controller';

describe('MasterDataCodesPublicController', () => {
  let controller: MasterDataCodesPublicController;
  let service: Record<string, jest.Mock<any>>;

  beforeEach(() => {
    service = {
      findAllWithPagination: (jest.fn() as jest.Mock<any>).mockResolvedValue(
        [],
      ),
    };
    controller = new MasterDataCodesPublicController(service as never);
  });

  const limitFor = async (query: Record<string, string | undefined>) => {
    await controller.findAll(query as never);
    const [{ paginationOptions }] = service.findAllWithPagination.mock
      .calls[0] as [{ paginationOptions: { limit: number; page: number } }];
    return paginationOptions.limit;
  };

  /**
   * This endpoint feeds FE dropdowns. A group with more active codes than the
   * page size silently loses options, which looks like missing master data
   * rather than a truncated response — so a groupKey query must not be capped
   * at a number a real group can exceed.
   */
  it('should return every active code in a group', async () => {
    expect(await limitFor({ groupKey: 'course_level' })).toBeGreaterThanOrEqual(
      1000,
    );
  });

  it('should still cap an unfiltered request', async () => {
    expect(await limitFor({})).toBeLessThanOrEqual(200);
  });

  it('should filter to the requested group and to active codes only', async () => {
    await controller.findAll({ groupKey: 'course_level' } as never);

    expect(service.findAllWithPagination).toHaveBeenCalledWith(
      expect.objectContaining({
        filterOptions: { groupKey: 'course_level', isActive: true },
      }),
    );
  });
});
