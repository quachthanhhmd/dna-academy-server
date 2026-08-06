import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
} from '@nestjs/common';
import { MasterDataCodesService } from './master-data-codes.service';
import { CreateMasterDataCodeDto } from './dto/create-master-data-code.dto';
import { UpdateMasterDataCodeDto } from './dto/update-master-data-code.dto';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiParam,
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

  @Post()
  @ApiCreatedResponse({
    type: MasterDataCode,
  })
  create(@Body() createMasterDataCodeDto: CreateMasterDataCodeDto) {
    return this.masterDataCodesService.create(createMasterDataCodeDto);
  }

  @Get()
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

  @Patch(':id')
  @ApiParam({
    name: 'id',
    type: String,
    required: true,
  })
  @ApiOkResponse({
    type: MasterDataCode,
  })
  update(
    @Param('id') id: string,
    @Body() updateMasterDataCodeDto: UpdateMasterDataCodeDto,
  ) {
    return this.masterDataCodesService.update(id, updateMasterDataCodeDto);
  }

  @Delete(':id')
  @ApiParam({
    name: 'id',
    type: String,
    required: true,
  })
  remove(@Param('id') id: string) {
    return this.masterDataCodesService.remove(id);
  }
}
