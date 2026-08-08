import { Controller, Get, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { MasterDataCodesService } from './master-data-codes.service';
import { MasterDataCode } from './domain/master-data-code';
import { FindPublicMasterDataCodesDto } from './dto/find-public-master-data-codes.dto';

@ApiTags('Masterdatacodes')
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
      'Source for FE dropdowns (onboarding, filters, etc). Only returns isActive=true codes — deactivated codes stay linked to existing records but drop out of this list.',
  })
  @Get()
  @ApiOkResponse({ type: [MasterDataCode] })
  findAll(
    @Query() query: FindPublicMasterDataCodesDto,
  ): Promise<MasterDataCode[]> {
    return this.masterDataCodesService.findAllWithPagination({
      filterOptions: { groupKey: query.groupKey, isActive: true },
      paginationOptions: { page: 1, limit: 50 },
    });
  }
}
