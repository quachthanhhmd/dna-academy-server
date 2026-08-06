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
import { MasterDataGroupsService } from './master-data-groups.service';
import { CreateMasterDataGroupDto } from './dto/create-master-data-group.dto';
import { UpdateMasterDataGroupDto } from './dto/update-master-data-group.dto';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { MasterDataGroup } from './domain/master-data-group';
import { AuthGuard } from '@nestjs/passport';
import {
  InfinityPaginationResponse,
  InfinityPaginationResponseDto,
} from '../utils/dto/infinity-pagination-response.dto';
import { infinityPagination } from '../utils/infinity-pagination';
import { FindAllMasterDataGroupsDto } from './dto/find-all-master-data-groups.dto';

@ApiTags('Masterdatagroups')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller({
  path: 'master-data-groups',
  version: '1',
})
export class MasterDataGroupsController {
  constructor(
    private readonly masterDataGroupsService: MasterDataGroupsService,
  ) {}

  @Post()
  @ApiCreatedResponse({
    type: MasterDataGroup,
  })
  create(@Body() createMasterDataGroupDto: CreateMasterDataGroupDto) {
    return this.masterDataGroupsService.create(createMasterDataGroupDto);
  }

  @Get()
  @ApiOkResponse({
    type: InfinityPaginationResponse(MasterDataGroup),
  })
  async findAll(
    @Query() query: FindAllMasterDataGroupsDto,
  ): Promise<InfinityPaginationResponseDto<MasterDataGroup>> {
    const page = query?.page ?? 1;
    let limit = query?.limit ?? 10;
    if (limit > 50) {
      limit = 50;
    }

    return infinityPagination(
      await this.masterDataGroupsService.findAllWithPagination({
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
    type: MasterDataGroup,
  })
  findById(@Param('id') id: string) {
    return this.masterDataGroupsService.findById(id);
  }

  @Patch(':id')
  @ApiParam({
    name: 'id',
    type: String,
    required: true,
  })
  @ApiOkResponse({
    type: MasterDataGroup,
  })
  update(
    @Param('id') id: string,
    @Body() updateMasterDataGroupDto: UpdateMasterDataGroupDto,
  ) {
    return this.masterDataGroupsService.update(id, updateMasterDataGroupDto);
  }

  @Delete(':id')
  @ApiParam({
    name: 'id',
    type: String,
    required: true,
  })
  remove(@Param('id') id: string) {
    return this.masterDataGroupsService.remove(id);
  }
}
