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
import { LectureContentVideosService } from './lecture-content-videos.service';
import { CreateLectureContentVideoDto } from './dto/create-lecture-content-video.dto';
import { UpdateLectureContentVideoDto } from './dto/update-lecture-content-video.dto';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { LectureContentVideo } from './domain/lecture-content-video';
import { AuthGuard } from '@nestjs/passport';
import {
  InfinityPaginationResponse,
  InfinityPaginationResponseDto,
} from '../utils/dto/infinity-pagination-response.dto';
import { infinityPagination } from '../utils/infinity-pagination';
import { FindAllLectureContentVideosDto } from './dto/find-all-lecture-content-videos.dto';

@ApiTags('Lecturecontentvideos')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller({
  path: 'lecture-content-videos',
  version: '1',
})
export class LectureContentVideosController {
  constructor(
    private readonly lectureContentVideosService: LectureContentVideosService,
  ) {}

  @Post()
  @ApiCreatedResponse({
    type: LectureContentVideo,
  })
  create(@Body() createLectureContentVideoDto: CreateLectureContentVideoDto) {
    return this.lectureContentVideosService.create(
      createLectureContentVideoDto,
    );
  }

  @Get()
  @ApiOkResponse({
    type: InfinityPaginationResponse(LectureContentVideo),
  })
  async findAll(
    @Query() query: FindAllLectureContentVideosDto,
  ): Promise<InfinityPaginationResponseDto<LectureContentVideo>> {
    const page = query?.page ?? 1;
    let limit = query?.limit ?? 10;
    if (limit > 50) {
      limit = 50;
    }

    return infinityPagination(
      await this.lectureContentVideosService.findAllWithPagination({
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
    type: LectureContentVideo,
  })
  findById(@Param('id') id: string) {
    return this.lectureContentVideosService.findById(id);
  }

  @Patch(':id')
  @ApiParam({
    name: 'id',
    type: String,
    required: true,
  })
  @ApiOkResponse({
    type: LectureContentVideo,
  })
  update(
    @Param('id') id: string,
    @Body() updateLectureContentVideoDto: UpdateLectureContentVideoDto,
  ) {
    return this.lectureContentVideosService.update(
      id,
      updateLectureContentVideoDto,
    );
  }

  @Delete(':id')
  @ApiParam({
    name: 'id',
    type: String,
    required: true,
  })
  remove(@Param('id') id: string) {
    return this.lectureContentVideosService.remove(id);
  }
}
