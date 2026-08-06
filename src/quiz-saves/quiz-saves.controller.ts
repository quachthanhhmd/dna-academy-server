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
import { QuizSavesService } from './quiz-saves.service';
import { CreateQuizSaveDto } from './dto/create-quiz-save.dto';
import { UpdateQuizSaveDto } from './dto/update-quiz-save.dto';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { QuizSave } from './domain/quiz-save';
import { AuthGuard } from '@nestjs/passport';
import {
  InfinityPaginationResponse,
  InfinityPaginationResponseDto,
} from '../utils/dto/infinity-pagination-response.dto';
import { infinityPagination } from '../utils/infinity-pagination';
import { FindAllQuizSavesDto } from './dto/find-all-quiz-saves.dto';

@ApiTags('Quizsaves')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller({
  path: 'quiz-saves',
  version: '1',
})
export class QuizSavesController {
  constructor(private readonly quizSavesService: QuizSavesService) {}

  @Post()
  @ApiCreatedResponse({
    type: QuizSave,
  })
  create(@Body() createQuizSaveDto: CreateQuizSaveDto) {
    return this.quizSavesService.create(createQuizSaveDto);
  }

  @Get()
  @ApiOkResponse({
    type: InfinityPaginationResponse(QuizSave),
  })
  async findAll(
    @Query() query: FindAllQuizSavesDto,
  ): Promise<InfinityPaginationResponseDto<QuizSave>> {
    const page = query?.page ?? 1;
    let limit = query?.limit ?? 10;
    if (limit > 50) {
      limit = 50;
    }

    return infinityPagination(
      await this.quizSavesService.findAllWithPagination({
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
    type: QuizSave,
  })
  findById(@Param('id') id: string) {
    return this.quizSavesService.findById(id);
  }

  @Patch(':id')
  @ApiParam({
    name: 'id',
    type: String,
    required: true,
  })
  @ApiOkResponse({
    type: QuizSave,
  })
  update(
    @Param('id') id: string,
    @Body() updateQuizSaveDto: UpdateQuizSaveDto,
  ) {
    return this.quizSavesService.update(id, updateQuizSaveDto);
  }

  @Delete(':id')
  @ApiParam({
    name: 'id',
    type: String,
    required: true,
  })
  remove(@Param('id') id: string) {
    return this.quizSavesService.remove(id);
  }
}
