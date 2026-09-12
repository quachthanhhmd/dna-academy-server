import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { MasterDataCodesService } from './master-data-codes.service';
import { MasterDataCode } from './domain/master-data-code';
import { FindPublicMasterDataCodesDto } from './dto/find-public-master-data-codes.dto';

/** Far above any realistic option count for one group. */
export const GROUP_CODE_LIMIT = 1000;
export const ALL_GROUPS_LIMIT = 200;

@ApiTags('Masterdatacodes')
// Optional auth: the endpoint stays public, but a supplied token lets the
// locale interceptor honour the caller's stored users.locale (Epic 6 §2.2.1
// step 3) without forcing anyone to sign in.
@UseGuards(AuthGuard(['jwt', 'anonymous']))
@Controller({
  path: 'master-data/codes',
  version: '1',
})
export class MasterDataCodesPublicController {
  constructor(
    private readonly masterDataCodesService: MasterDataCodesService,
  ) {}

  @ApiOperation({
    summary: 'Public: get active codes for a group (no auth)',
    description:
      'Source for FE dropdowns (onboarding, filters, etc). Only returns isActive=true codes — deactivated codes stay linked to existing records but drop out of this list. With groupKey set the whole group is returned, unpaged; without it the response is capped.',
  })
  @Get()
  @ApiOkResponse({ type: [MasterDataCode] })
  findAll(
    @Query() query: FindPublicMasterDataCodesDto,
  ): Promise<MasterDataCode[]> {
    return this.masterDataCodesService.findAllWithPagination({
      filterOptions: { groupKey: query.groupKey, isActive: true },
      paginationOptions: {
        page: 1,
        // A dropdown must show every option: a group that outgrows the page
        // size would silently lose codes, which reads as missing master data
        // rather than a truncated response. Unfiltered requests stay capped
        // because they span every group at once.
        limit: query.groupKey ? GROUP_CODE_LIMIT : ALL_GROUPS_LIMIT,
      },
    });
  }
}
