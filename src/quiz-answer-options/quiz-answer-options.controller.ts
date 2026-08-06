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
import { QuizAnswerOptionsService } from './quiz-answer-options.service';
import { CreateQuizAnswerOptionDto } from './dto/create-quiz-answer-option.dto';
import { UpdateQuizAnswerOptionDto } from './dto/update-quiz-answer-option.dto';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { QuizAnswerOption } from './domain/quiz-answer-option';
import { AuthGuard } from '@nestjs/passport';
import {
  InfinityPaginationResponse,
  InfinityPaginationResponseDto,
} from '../utils/dto/infinity-pagination-response.dto';
import { infinityPagination } from '../utils/infinity-pagination';
import { FindAllQuizAnswerOptionsDto } from './dto/find-all-quiz-answer-options.dto';

@ApiTags('Quizansweroptions')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller({
  path: 'quiz-answer-options',
  version: '1',
})
export class QuizAnswerOptionsController {
  constructor(
    private readonly quizAnswerOptionsService: QuizAnswerOptionsService,
  ) {}

  @Post()
  @ApiCreatedResponse({
    type: QuizAnswerOption,
  })
  create(@Body() createQuizAnswerOptionDto: CreateQuizAnswerOptionDto) {
    return this.quizAnswerOptionsService.create(createQuizAnswerOptionDto);
  }

  @Get()
  @ApiOkResponse({
    type: InfinityPaginationResponse(QuizAnswerOption),
  })
  async findAll(
    @Query() query: FindAllQuizAnswerOptionsDto,
  ): Promise<InfinityPaginationResponseDto<QuizAnswerOption>> {
    const page = query?.page ?? 1;
    let limit = query?.limit ?? 10;
    if (limit > 50) {
      limit = 50;
    }

    return infinityPagination(
      await this.quizAnswerOptionsService.findAllWithPagination({
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
    type: QuizAnswerOption,
  })
  findById(@Param('id') id: string) {
    return this.quizAnswerOptionsService.findById(id);
  }

  @Patch(':id')
  @ApiParam({
    name: 'id',
    type: String,
    required: true,
  })
  @ApiOkResponse({
    type: QuizAnswerOption,
  })
  update(
    @Param('id') id: string,
    @Body() updateQuizAnswerOptionDto: UpdateQuizAnswerOptionDto,
  ) {
    return this.quizAnswerOptionsService.update(id, updateQuizAnswerOptionDto);
  }

  @Delete(':id')
  @ApiParam({
    name: 'id',
    type: String,
    required: true,
  })
  remove(@Param('id') id: string) {
    return this.quizAnswerOptionsService.remove(id);
  }
}
