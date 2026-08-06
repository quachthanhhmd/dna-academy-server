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
import { LectureContentReflectionsService } from './lecture-content-reflections.service';
import { CreateLectureContentReflectionDto } from './dto/create-lecture-content-reflection.dto';
import { UpdateLectureContentReflectionDto } from './dto/update-lecture-content-reflection.dto';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { LectureContentReflection } from './domain/lecture-content-reflection';
import { AuthGuard } from '@nestjs/passport';
import {
  InfinityPaginationResponse,
  InfinityPaginationResponseDto,
} from '../utils/dto/infinity-pagination-response.dto';
import { infinityPagination } from '../utils/infinity-pagination';
import { FindAllLectureContentReflectionsDto } from './dto/find-all-lecture-content-reflections.dto';

@ApiTags('Lecturecontentreflections')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller({
  path: 'lecture-content-reflections',
  version: '1',
})
export class LectureContentReflectionsController {
  constructor(
    private readonly lectureContentReflectionsService: LectureContentReflectionsService,
  ) {}

  @Post()
  @ApiCreatedResponse({
    type: LectureContentReflection,
  })
  create(
    @Body()
    createLectureContentReflectionDto: CreateLectureContentReflectionDto,
  ) {
    return this.lectureContentReflectionsService.create(
      createLectureContentReflectionDto,
    );
  }

  @Get()
  @ApiOkResponse({
    type: InfinityPaginationResponse(LectureContentReflection),
  })
  async findAll(
    @Query() query: FindAllLectureContentReflectionsDto,
  ): Promise<InfinityPaginationResponseDto<LectureContentReflection>> {
    const page = query?.page ?? 1;
    let limit = query?.limit ?? 10;
    if (limit > 50) {
      limit = 50;
    }

    return infinityPagination(
      await this.lectureContentReflectionsService.findAllWithPagination({
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
    type: LectureContentReflection,
  })
  findById(@Param('id') id: string) {
    return this.lectureContentReflectionsService.findById(id);
  }

  @Patch(':id')
  @ApiParam({
    name: 'id',
    type: String,
    required: true,
  })
  @ApiOkResponse({
    type: LectureContentReflection,
  })
  update(
    @Param('id') id: string,
    @Body()
    updateLectureContentReflectionDto: UpdateLectureContentReflectionDto,
  ) {
    return this.lectureContentReflectionsService.update(
      id,
      updateLectureContentReflectionDto,
    );
  }

  @Delete(':id')
  @ApiParam({
    name: 'id',
    type: String,
    required: true,
  })
  remove(@Param('id') id: string) {
    return this.lectureContentReflectionsService.remove(id);
  }
}
