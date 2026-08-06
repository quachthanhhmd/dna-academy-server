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
import { LectureProgressesService } from './lecture-progresses.service';
import { CreateLectureProgressDto } from './dto/create-lecture-progress.dto';
import { UpdateLectureProgressDto } from './dto/update-lecture-progress.dto';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { LectureProgress } from './domain/lecture-progress';
import { AuthGuard } from '@nestjs/passport';
import {
  InfinityPaginationResponse,
  InfinityPaginationResponseDto,
} from '../utils/dto/infinity-pagination-response.dto';
import { infinityPagination } from '../utils/infinity-pagination';
import { FindAllLectureProgressesDto } from './dto/find-all-lecture-progresses.dto';

@ApiTags('Lectureprogresses')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller({
  path: 'lecture-progresses',
  version: '1',
})
export class LectureProgressesController {
  constructor(
    private readonly lectureProgressesService: LectureProgressesService,
  ) {}

  @Post()
  @ApiCreatedResponse({
    type: LectureProgress,
  })
  create(@Body() createLectureProgressDto: CreateLectureProgressDto) {
    return this.lectureProgressesService.create(createLectureProgressDto);
  }

  @Get()
  @ApiOkResponse({
    type: InfinityPaginationResponse(LectureProgress),
  })
  async findAll(
    @Query() query: FindAllLectureProgressesDto,
  ): Promise<InfinityPaginationResponseDto<LectureProgress>> {
    const page = query?.page ?? 1;
    let limit = query?.limit ?? 10;
    if (limit > 50) {
      limit = 50;
    }

    return infinityPagination(
      await this.lectureProgressesService.findAllWithPagination({
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
    type: LectureProgress,
  })
  findById(@Param('id') id: string) {
    return this.lectureProgressesService.findById(id);
  }

  @Patch(':id')
  @ApiParam({
    name: 'id',
    type: String,
    required: true,
  })
  @ApiOkResponse({
    type: LectureProgress,
  })
  update(
    @Param('id') id: string,
    @Body() updateLectureProgressDto: UpdateLectureProgressDto,
  ) {
    return this.lectureProgressesService.update(id, updateLectureProgressDto);
  }

  @Delete(':id')
  @ApiParam({
    name: 'id',
    type: String,
    required: true,
  })
  remove(@Param('id') id: string) {
    return this.lectureProgressesService.remove(id);
  }
}
