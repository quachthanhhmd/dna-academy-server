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
import { QuizQuestionsService } from './quiz-questions.service';
import { CreateQuizQuestionDto } from './dto/create-quiz-question.dto';
import { UpdateQuizQuestionDto } from './dto/update-quiz-question.dto';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { QuizQuestion } from './domain/quiz-question';
import { AuthGuard } from '@nestjs/passport';
import { PermissionGuard } from '../authorization/permission.guard';
import { RequirePermission } from '../authorization/require-permission.decorator';
import {
  InfinityPaginationResponse,
  InfinityPaginationResponseDto,
} from '../utils/dto/infinity-pagination-response.dto';
import { infinityPagination } from '../utils/infinity-pagination';
import { FindAllQuizQuestionsDto } from './dto/find-all-quiz-questions.dto';

@ApiTags('Quizquestions')
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
  path: 'quiz-questions',
  version: '1',
})
export class QuizQuestionsController {
  constructor(private readonly quizQuestionsService: QuizQuestionsService) {}

  @Post()
  @ApiCreatedResponse({
    type: QuizQuestion,
  })
  create(@Body() createQuizQuestionDto: CreateQuizQuestionDto) {
    return this.quizQuestionsService.create(createQuizQuestionDto);
  }

  @Get()
  @ApiOkResponse({
    type: InfinityPaginationResponse(QuizQuestion),
  })
  async findAll(
    @Query() query: FindAllQuizQuestionsDto,
  ): Promise<InfinityPaginationResponseDto<QuizQuestion>> {
    const page = query?.page ?? 1;
    let limit = query?.limit ?? 10;
    if (limit > 50) {
      limit = 50;
    }

    return infinityPagination(
      await this.quizQuestionsService.findAllWithPagination({
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
    type: QuizQuestion,
  })
  findById(@Param('id') id: string) {
    return this.quizQuestionsService.findById(id);
  }

  @Patch(':id')
  @ApiParam({
    name: 'id',
    type: String,
    required: true,
  })
  @ApiOkResponse({
    type: QuizQuestion,
  })
  update(
    @Param('id') id: string,
    @Body() updateQuizQuestionDto: UpdateQuizQuestionDto,
  ) {
    return this.quizQuestionsService.update(id, updateQuizQuestionDto);
  }

  @Delete(':id')
  @ApiParam({
    name: 'id',
    type: String,
    required: true,
  })
  remove(@Param('id') id: string) {
    return this.quizQuestionsService.remove(id);
  }
}
