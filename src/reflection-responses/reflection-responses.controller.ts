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
import { ReflectionResponsesService } from './reflection-responses.service';
import { CreateReflectionResponseDto } from './dto/create-reflection-response.dto';
import { UpdateReflectionResponseDto } from './dto/update-reflection-response.dto';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { ReflectionResponse } from './domain/reflection-response';
import { AuthGuard } from '@nestjs/passport';
import { PermissionGuard } from '../authorization/permission.guard';
import { RequirePermission } from '../authorization/require-permission.decorator';
import {
  InfinityPaginationResponse,
  InfinityPaginationResponseDto,
} from '../utils/dto/infinity-pagination-response.dto';
import { infinityPagination } from '../utils/infinity-pagination';
import { FindAllReflectionResponsesDto } from './dto/find-all-reflection-responses.dto';

@ApiTags('Reflectionresponses')
@ApiBearerAuth()
/**
 * Boilerplate-generated CRUD. It is admin-only: every route here reads or
 * writes another student's learning record, and none of it enforces the rules
 * the /learning endpoints do (sequential locking, grading, word counts,
 * completion detection). Students use the purpose-built modules instead.
 */
@UseGuards(AuthGuard('jwt'), PermissionGuard)
@RequirePermission('courses', 'edit')
@Controller({
  path: 'reflection-responses',
  version: '1',
})
export class ReflectionResponsesController {
  constructor(
    private readonly reflectionResponsesService: ReflectionResponsesService,
  ) {}

  @Post()
  @ApiCreatedResponse({
    type: ReflectionResponse,
  })
  create(@Body() createReflectionResponseDto: CreateReflectionResponseDto) {
    return this.reflectionResponsesService.create(createReflectionResponseDto);
  }

  @Get()
  @ApiOkResponse({
    type: InfinityPaginationResponse(ReflectionResponse),
  })
  async findAll(
    @Query() query: FindAllReflectionResponsesDto,
  ): Promise<InfinityPaginationResponseDto<ReflectionResponse>> {
    const page = query?.page ?? 1;
    let limit = query?.limit ?? 10;
    if (limit > 50) {
      limit = 50;
    }

    return infinityPagination(
      await this.reflectionResponsesService.findAllWithPagination({
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
    type: ReflectionResponse,
  })
  findById(@Param('id') id: string) {
    return this.reflectionResponsesService.findById(id);
  }

  @Patch(':id')
  @ApiParam({
    name: 'id',
    type: String,
    required: true,
  })
  @ApiOkResponse({
    type: ReflectionResponse,
  })
  update(
    @Param('id') id: string,
    @Body() updateReflectionResponseDto: UpdateReflectionResponseDto,
  ) {
    return this.reflectionResponsesService.update(
      id,
      updateReflectionResponseDto,
    );
  }

  @Delete(':id')
  @ApiParam({
    name: 'id',
    type: String,
    required: true,
  })
  remove(@Param('id') id: string) {
    return this.reflectionResponsesService.remove(id);
  }
}
