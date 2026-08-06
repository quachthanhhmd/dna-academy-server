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
import { OauthAccountsService } from './oauth-accounts.service';
import { CreateOauthAccountDto } from './dto/create-oauth-account.dto';
import { UpdateOauthAccountDto } from './dto/update-oauth-account.dto';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { OauthAccount } from './domain/oauth-account';
import { AuthGuard } from '@nestjs/passport';
import {
  InfinityPaginationResponse,
  InfinityPaginationResponseDto,
} from '../utils/dto/infinity-pagination-response.dto';
import { infinityPagination } from '../utils/infinity-pagination';
import { FindAllOauthAccountsDto } from './dto/find-all-oauth-accounts.dto';

@ApiTags('Oauthaccounts')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller({
  path: 'oauth-accounts',
  version: '1',
})
export class OauthAccountsController {
  constructor(private readonly oauthAccountsService: OauthAccountsService) {}

  @Post()
  @ApiCreatedResponse({
    type: OauthAccount,
  })
  create(@Body() createOauthAccountDto: CreateOauthAccountDto) {
    return this.oauthAccountsService.create(createOauthAccountDto);
  }

  @Get()
  @ApiOkResponse({
    type: InfinityPaginationResponse(OauthAccount),
  })
  async findAll(
    @Query() query: FindAllOauthAccountsDto,
  ): Promise<InfinityPaginationResponseDto<OauthAccount>> {
    const page = query?.page ?? 1;
    let limit = query?.limit ?? 10;
    if (limit > 50) {
      limit = 50;
    }

    return infinityPagination(
      await this.oauthAccountsService.findAllWithPagination({
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
    type: OauthAccount,
  })
  findById(@Param('id') id: string) {
    return this.oauthAccountsService.findById(id);
  }

  @Patch(':id')
  @ApiParam({
    name: 'id',
    type: String,
    required: true,
  })
  @ApiOkResponse({
    type: OauthAccount,
  })
  update(
    @Param('id') id: string,
    @Body() updateOauthAccountDto: UpdateOauthAccountDto,
  ) {
    return this.oauthAccountsService.update(id, updateOauthAccountDto);
  }

  @Delete(':id')
  @ApiParam({
    name: 'id',
    type: String,
    required: true,
  })
  remove(@Param('id') id: string) {
    return this.oauthAccountsService.remove(id);
  }
}
