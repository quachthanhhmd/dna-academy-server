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
import { LectureContentQuizzesService } from './lecture-content-quizzes.service';
import { CreateLectureContentQuizDto } from './dto/create-lecture-content-quiz.dto';
import { UpdateLectureContentQuizDto } from './dto/update-lecture-content-quiz.dto';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { LectureContentQuiz } from './domain/lecture-content-quiz';
import { AuthGuard } from '@nestjs/passport';
import {
  InfinityPaginationResponse,
  InfinityPaginationResponseDto,
} from '../utils/dto/infinity-pagination-response.dto';
import { infinityPagination } from '../utils/infinity-pagination';
import { FindAllLectureContentQuizzesDto } from './dto/find-all-lecture-content-quizzes.dto';

@ApiTags('Lecturecontentquizzes')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller({
  path: 'lecture-content-quizzes',
  version: '1',
})
export class LectureContentQuizzesController {
  constructor(
    private readonly lectureContentQuizzesService: LectureContentQuizzesService,
  ) {}

  @Post()
  @ApiCreatedResponse({
    type: LectureContentQuiz,
  })
  create(@Body() createLectureContentQuizDto: CreateLectureContentQuizDto) {
    return this.lectureContentQuizzesService.create(
      createLectureContentQuizDto,
    );
  }

  @Get()
  @ApiOkResponse({
    type: InfinityPaginationResponse(LectureContentQuiz),
  })
  async findAll(
    @Query() query: FindAllLectureContentQuizzesDto,
  ): Promise<InfinityPaginationResponseDto<LectureContentQuiz>> {
    const page = query?.page ?? 1;
    let limit = query?.limit ?? 10;
    if (limit > 50) {
      limit = 50;
    }

    return infinityPagination(
      await this.lectureContentQuizzesService.findAllWithPagination({
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
    type: LectureContentQuiz,
  })
  findById(@Param('id') id: string) {
    return this.lectureContentQuizzesService.findById(id);
  }

  @Patch(':id')
  @ApiParam({
    name: 'id',
    type: String,
    required: true,
  })
  @ApiOkResponse({
    type: LectureContentQuiz,
  })
  update(
    @Param('id') id: string,
    @Body() updateLectureContentQuizDto: UpdateLectureContentQuizDto,
  ) {
    return this.lectureContentQuizzesService.update(
      id,
      updateLectureContentQuizDto,
    );
  }

  @Delete(':id')
  @ApiParam({
    name: 'id',
    type: String,
    required: true,
  })
  remove(@Param('id') id: string) {
    return this.lectureContentQuizzesService.remove(id);
  }
}
