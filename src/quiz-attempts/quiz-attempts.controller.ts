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
import { QuizAttemptsService } from './quiz-attempts.service';
import { CreateQuizAttemptDto } from './dto/create-quiz-attempt.dto';
import { UpdateQuizAttemptDto } from './dto/update-quiz-attempt.dto';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { QuizAttempt } from './domain/quiz-attempt';
import { AuthGuard } from '@nestjs/passport';
import { PermissionGuard } from '../authorization/permission.guard';
import { RequirePermission } from '../authorization/require-permission.decorator';
import {
  InfinityPaginationResponse,
  InfinityPaginationResponseDto,
} from '../utils/dto/infinity-pagination-response.dto';
import { infinityPagination } from '../utils/infinity-pagination';
import { FindAllQuizAttemptsDto } from './dto/find-all-quiz-attempts.dto';

@ApiTags('Quizattempts')
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
  path: 'quiz-attempts',
  version: '1',
})
export class QuizAttemptsController {
  constructor(private readonly quizAttemptsService: QuizAttemptsService) {}

  @Post()
  @ApiCreatedResponse({
    type: QuizAttempt,
  })
  create(@Body() createQuizAttemptDto: CreateQuizAttemptDto) {
    return this.quizAttemptsService.create(createQuizAttemptDto);
  }

  @Get()
  @ApiOkResponse({
    type: InfinityPaginationResponse(QuizAttempt),
  })
  async findAll(
    @Query() query: FindAllQuizAttemptsDto,
  ): Promise<InfinityPaginationResponseDto<QuizAttempt>> {
    const page = query?.page ?? 1;
    let limit = query?.limit ?? 10;
    if (limit > 50) {
      limit = 50;
    }

    return infinityPagination(
      await this.quizAttemptsService.findAllWithPagination({
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
    type: QuizAttempt,
  })
  findById(@Param('id') id: string) {
    return this.quizAttemptsService.findById(id);
  }

  @Patch(':id')
  @ApiParam({
    name: 'id',
    type: String,
    required: true,
  })
  @ApiOkResponse({
    type: QuizAttempt,
  })
  update(
    @Param('id') id: string,
    @Body() updateQuizAttemptDto: UpdateQuizAttemptDto,
  ) {
    return this.quizAttemptsService.update(id, updateQuizAttemptDto);
  }

  @Delete(':id')
  @ApiParam({
    name: 'id',
    type: String,
    required: true,
  })
  remove(@Param('id') id: string) {
    return this.quizAttemptsService.remove(id);
  }
}
