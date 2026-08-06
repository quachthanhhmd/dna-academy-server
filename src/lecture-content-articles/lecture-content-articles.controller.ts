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
import { LectureContentArticlesService } from './lecture-content-articles.service';
import { CreateLectureContentArticleDto } from './dto/create-lecture-content-article.dto';
import { UpdateLectureContentArticleDto } from './dto/update-lecture-content-article.dto';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { LectureContentArticle } from './domain/lecture-content-article';
import { AuthGuard } from '@nestjs/passport';
import {
  InfinityPaginationResponse,
  InfinityPaginationResponseDto,
} from '../utils/dto/infinity-pagination-response.dto';
import { infinityPagination } from '../utils/infinity-pagination';
import { FindAllLectureContentArticlesDto } from './dto/find-all-lecture-content-articles.dto';

@ApiTags('Lecturecontentarticles')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller({
  path: 'lecture-content-articles',
  version: '1',
})
export class LectureContentArticlesController {
  constructor(
    private readonly lectureContentArticlesService: LectureContentArticlesService,
  ) {}

  @Post()
  @ApiCreatedResponse({
    type: LectureContentArticle,
  })
  create(
    @Body() createLectureContentArticleDto: CreateLectureContentArticleDto,
  ) {
    return this.lectureContentArticlesService.create(
      createLectureContentArticleDto,
    );
  }

  @Get()
  @ApiOkResponse({
    type: InfinityPaginationResponse(LectureContentArticle),
  })
  async findAll(
    @Query() query: FindAllLectureContentArticlesDto,
  ): Promise<InfinityPaginationResponseDto<LectureContentArticle>> {
    const page = query?.page ?? 1;
    let limit = query?.limit ?? 10;
    if (limit > 50) {
      limit = 50;
    }

    return infinityPagination(
      await this.lectureContentArticlesService.findAllWithPagination({
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
    type: LectureContentArticle,
  })
  findById(@Param('id') id: string) {
    return this.lectureContentArticlesService.findById(id);
  }

  @Patch(':id')
  @ApiParam({
    name: 'id',
    type: String,
    required: true,
  })
  @ApiOkResponse({
    type: LectureContentArticle,
  })
  update(
    @Param('id') id: string,
    @Body() updateLectureContentArticleDto: UpdateLectureContentArticleDto,
  ) {
    return this.lectureContentArticlesService.update(
      id,
      updateLectureContentArticleDto,
    );
  }

  @Delete(':id')
  @ApiParam({
    name: 'id',
    type: String,
    required: true,
  })
  remove(@Param('id') id: string) {
    return this.lectureContentArticlesService.remove(id);
  }
}
