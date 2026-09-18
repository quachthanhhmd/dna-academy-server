import { Controller, Get, Param, UseGuards, Query } from '@nestjs/common';
import { MasterDataCodesService } from './master-data-codes.service';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { MasterDataCode } from './domain/master-data-code';
import { AuthGuard } from '@nestjs/passport';
import {
  InfinityPaginationResponse,
  InfinityPaginationResponseDto,
} from '../utils/dto/infinity-pagination-response.dto';
import { infinityPagination } from '../utils/infinity-pagination';
import { FindAllMasterDataCodesDto } from './dto/find-all-master-data-codes.dto';

/**
 * Read-only. Onboarding populates its selects from `GET ?groupKey=`.
 *
 * The generated create, edit and delete handlers were open to every logged-in
 * user (permission model §1.10); master data is written through
 * `/admin/master-data`, behind `master_data:*`.
 */
@ApiTags('Masterdatacodes')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller({
  path: 'master-data-codes',
  version: '1',
})
export class MasterDataCodesController {
  constructor(
    private readonly masterDataCodesService: MasterDataCodesService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'List lookup codes, optionally filtered by group',
    description:
      'Used to populate onboarding <Select>/<MultiSelect> options, e.g. ?groupKey=education_stage or ?groupKey=career_interest.',
  })
  @ApiQuery({
    name: 'groupKey',
    type: String,
    required: false,
    description:
      'Filter by the owning group key, e.g. "education_stage" or "career_interest".',
  })
  @ApiOkResponse({
    type: InfinityPaginationResponse(MasterDataCode),
  })
  async findAll(
    @Query() query: FindAllMasterDataCodesDto,
  ): Promise<InfinityPaginationResponseDto<MasterDataCode>> {
    const page = query?.page ?? 1;
    let limit = query?.limit ?? 10;
    if (limit > 50) {
      limit = 50;
    }

    return infinityPagination(
      await this.masterDataCodesService.findAllWithPagination({
        filterOptions: {
          groupKey: query?.groupKey,
        },
        paginationOptions: {
          page,
          limit,
        },
      }),
      { page, limit },
    );
  }

  @Get(':id')
  @ApiParam({
    name: 'id',
    type: String,
    required: true,
  })
  @ApiOkResponse({
    type: MasterDataCode,
  })
  findById(@Param('id') id: string) {
    return this.masterDataCodesService.findById(id);
  }
}
