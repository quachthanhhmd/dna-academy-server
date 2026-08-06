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
import { MediaFilesService } from './media-files.service';
import { CreateMediaFileDto } from './dto/create-media-file.dto';
import { UpdateMediaFileDto } from './dto/update-media-file.dto';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { MediaFile } from './domain/media-file';
import { AuthGuard } from '@nestjs/passport';
import {
  InfinityPaginationResponse,
  InfinityPaginationResponseDto,
} from '../utils/dto/infinity-pagination-response.dto';
import { infinityPagination } from '../utils/infinity-pagination';
import { FindAllMediaFilesDto } from './dto/find-all-media-files.dto';

@ApiTags('Mediafiles')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller({
  path: 'media-files',
  version: '1',
})
export class MediaFilesController {
  constructor(private readonly mediaFilesService: MediaFilesService) {}

  @Post()
  @ApiCreatedResponse({
    type: MediaFile,
  })
  create(@Body() createMediaFileDto: CreateMediaFileDto) {
    return this.mediaFilesService.create(createMediaFileDto);
  }

  @Get()
  @ApiOkResponse({
    type: InfinityPaginationResponse(MediaFile),
  })
  async findAll(
    @Query() query: FindAllMediaFilesDto,
  ): Promise<InfinityPaginationResponseDto<MediaFile>> {
    const page = query?.page ?? 1;
    let limit = query?.limit ?? 10;
    if (limit > 50) {
      limit = 50;
    }

    return infinityPagination(
      await this.mediaFilesService.findAllWithPagination({
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
    type: MediaFile,
  })
  findById(@Param('id') id: string) {
    return this.mediaFilesService.findById(id);
  }

  @Patch(':id')
  @ApiParam({
    name: 'id',
    type: String,
    required: true,
  })
  @ApiOkResponse({
    type: MediaFile,
  })
  update(
    @Param('id') id: string,
    @Body() updateMediaFileDto: UpdateMediaFileDto,
  ) {
    return this.mediaFilesService.update(id, updateMediaFileDto);
  }

  @Delete(':id')
  @ApiParam({
    name: 'id',
    type: String,
    required: true,
  })
  remove(@Param('id') id: string) {
    return this.mediaFilesService.remove(id);
  }
}
