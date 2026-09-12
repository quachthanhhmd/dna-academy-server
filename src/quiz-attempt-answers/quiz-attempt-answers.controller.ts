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
import { QuizAttemptAnswersService } from './quiz-attempt-answers.service';
import { CreateQuizAttemptAnswerDto } from './dto/create-quiz-attempt-answer.dto';
import { UpdateQuizAttemptAnswerDto } from './dto/update-quiz-attempt-answer.dto';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { QuizAttemptAnswer } from './domain/quiz-attempt-answer';
import { AuthGuard } from '@nestjs/passport';
import { PermissionGuard } from '../authorization/permission.guard';
import { RequirePermission } from '../authorization/require-permission.decorator';
import {
  InfinityPaginationResponse,
  InfinityPaginationResponseDto,
} from '../utils/dto/infinity-pagination-response.dto';
import { infinityPagination } from '../utils/infinity-pagination';
import { FindAllQuizAttemptAnswersDto } from './dto/find-all-quiz-attempt-answers.dto';

@ApiTags('Quizattemptanswers')
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
  path: 'quiz-attempt-answers',
  version: '1',
})
export class QuizAttemptAnswersController {
  constructor(
    private readonly quizAttemptAnswersService: QuizAttemptAnswersService,
  ) {}

  @Post()
  @ApiCreatedResponse({
    type: QuizAttemptAnswer,
  })
  create(@Body() createQuizAttemptAnswerDto: CreateQuizAttemptAnswerDto) {
    return this.quizAttemptAnswersService.create(createQuizAttemptAnswerDto);
  }

  @Get()
  @ApiOkResponse({
    type: InfinityPaginationResponse(QuizAttemptAnswer),
  })
  async findAll(
    @Query() query: FindAllQuizAttemptAnswersDto,
  ): Promise<InfinityPaginationResponseDto<QuizAttemptAnswer>> {
    const page = query?.page ?? 1;
    let limit = query?.limit ?? 10;
    if (limit > 50) {
      limit = 50;
    }

    return infinityPagination(
      await this.quizAttemptAnswersService.findAllWithPagination({
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
    type: QuizAttemptAnswer,
  })
  findById(@Param('id') id: string) {
    return this.quizAttemptAnswersService.findById(id);
  }

  @Patch(':id')
  @ApiParam({
    name: 'id',
    type: String,
    required: true,
  })
  @ApiOkResponse({
    type: QuizAttemptAnswer,
  })
  update(
    @Param('id') id: string,
    @Body() updateQuizAttemptAnswerDto: UpdateQuizAttemptAnswerDto,
  ) {
    return this.quizAttemptAnswersService.update(
      id,
      updateQuizAttemptAnswerDto,
    );
  }

  @Delete(':id')
  @ApiParam({
    name: 'id',
    type: String,
    required: true,
  })
  remove(@Param('id') id: string) {
    return this.quizAttemptAnswersService.remove(id);
  }
}
