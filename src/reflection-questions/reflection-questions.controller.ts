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
import { ReflectionQuestionsService } from './reflection-questions.service';
import { CreateReflectionQuestionDto } from './dto/create-reflection-question.dto';
import { UpdateReflectionQuestionDto } from './dto/update-reflection-question.dto';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { ReflectionQuestion } from './domain/reflection-question';
import { AuthGuard } from '@nestjs/passport';
import {
  InfinityPaginationResponse,
  InfinityPaginationResponseDto,
} from '../utils/dto/infinity-pagination-response.dto';
import { infinityPagination } from '../utils/infinity-pagination';
import { FindAllReflectionQuestionsDto } from './dto/find-all-reflection-questions.dto';

@ApiTags('Reflectionquestions')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller({
  path: 'reflection-questions',
  version: '1',
})
export class ReflectionQuestionsController {
  constructor(
    private readonly reflectionQuestionsService: ReflectionQuestionsService,
  ) {}

  @Post()
  @ApiCreatedResponse({
    type: ReflectionQuestion,
  })
  create(@Body() createReflectionQuestionDto: CreateReflectionQuestionDto) {
    return this.reflectionQuestionsService.create(createReflectionQuestionDto);
  }

  @Get()
  @ApiOkResponse({
    type: InfinityPaginationResponse(ReflectionQuestion),
  })
  async findAll(
    @Query() query: FindAllReflectionQuestionsDto,
  ): Promise<InfinityPaginationResponseDto<ReflectionQuestion>> {
    const page = query?.page ?? 1;
    let limit = query?.limit ?? 10;
    if (limit > 50) {
      limit = 50;
    }

    return infinityPagination(
      await this.reflectionQuestionsService.findAllWithPagination({
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
    type: ReflectionQuestion,
  })
  findById(@Param('id') id: string) {
    return this.reflectionQuestionsService.findById(id);
  }

  @Patch(':id')
  @ApiParam({
    name: 'id',
    type: String,
    required: true,
  })
  @ApiOkResponse({
    type: ReflectionQuestion,
  })
  update(
    @Param('id') id: string,
    @Body() updateReflectionQuestionDto: UpdateReflectionQuestionDto,
  ) {
    return this.reflectionQuestionsService.update(
      id,
      updateReflectionQuestionDto,
    );
  }

  @Delete(':id')
  @ApiParam({
    name: 'id',
    type: String,
    required: true,
  })
  remove(@Param('id') id: string) {
    return this.reflectionQuestionsService.remove(id);
  }
}
