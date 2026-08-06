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
import { CareerReflectionQuestionsService } from './career-reflection-questions.service';
import { CreateCareerReflectionQuestionDto } from './dto/create-career-reflection-question.dto';
import { UpdateCareerReflectionQuestionDto } from './dto/update-career-reflection-question.dto';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { CareerReflectionQuestion } from './domain/career-reflection-question';
import { AuthGuard } from '@nestjs/passport';
import {
  InfinityPaginationResponse,
  InfinityPaginationResponseDto,
} from '../utils/dto/infinity-pagination-response.dto';
import { infinityPagination } from '../utils/infinity-pagination';
import { FindAllCareerReflectionQuestionsDto } from './dto/find-all-career-reflection-questions.dto';

@ApiTags('Careerreflectionquestions')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller({
  path: 'career-reflection-questions',
  version: '1',
})
export class CareerReflectionQuestionsController {
  constructor(
    private readonly careerReflectionQuestionsService: CareerReflectionQuestionsService,
  ) {}

  @Post()
  @ApiCreatedResponse({
    type: CareerReflectionQuestion,
  })
  create(
    @Body()
    createCareerReflectionQuestionDto: CreateCareerReflectionQuestionDto,
  ) {
    return this.careerReflectionQuestionsService.create(
      createCareerReflectionQuestionDto,
    );
  }

  @Get()
  @ApiOkResponse({
    type: InfinityPaginationResponse(CareerReflectionQuestion),
  })
  async findAll(
    @Query() query: FindAllCareerReflectionQuestionsDto,
  ): Promise<InfinityPaginationResponseDto<CareerReflectionQuestion>> {
    const page = query?.page ?? 1;
    let limit = query?.limit ?? 10;
    if (limit > 50) {
      limit = 50;
    }

    return infinityPagination(
      await this.careerReflectionQuestionsService.findAllWithPagination({
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
    type: CareerReflectionQuestion,
  })
  findById(@Param('id') id: string) {
    return this.careerReflectionQuestionsService.findById(id);
  }

  @Patch(':id')
  @ApiParam({
    name: 'id',
    type: String,
    required: true,
  })
  @ApiOkResponse({
    type: CareerReflectionQuestion,
  })
  update(
    @Param('id') id: string,
    @Body()
    updateCareerReflectionQuestionDto: UpdateCareerReflectionQuestionDto,
  ) {
    return this.careerReflectionQuestionsService.update(
      id,
      updateCareerReflectionQuestionDto,
    );
  }

  @Delete(':id')
  @ApiParam({
    name: 'id',
    type: String,
    required: true,
  })
  remove(@Param('id') id: string) {
    return this.careerReflectionQuestionsService.remove(id);
  }
}
