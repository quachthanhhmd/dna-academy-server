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
import { CareerReflectionAnswersService } from './career-reflection-answers.service';
import { CreateCareerReflectionAnswerDto } from './dto/create-career-reflection-answer.dto';
import { UpdateCareerReflectionAnswerDto } from './dto/update-career-reflection-answer.dto';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { CareerReflectionAnswer } from './domain/career-reflection-answer';
import { AuthGuard } from '@nestjs/passport';
import {
  InfinityPaginationResponse,
  InfinityPaginationResponseDto,
} from '../utils/dto/infinity-pagination-response.dto';
import { infinityPagination } from '../utils/infinity-pagination';
import { FindAllCareerReflectionAnswersDto } from './dto/find-all-career-reflection-answers.dto';

@ApiTags('Careerreflectionanswers')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller({
  path: 'career-reflection-answers',
  version: '1',
})
export class CareerReflectionAnswersController {
  constructor(
    private readonly careerReflectionAnswersService: CareerReflectionAnswersService,
  ) {}

  @Post()
  @ApiCreatedResponse({
    type: CareerReflectionAnswer,
  })
  create(
    @Body() createCareerReflectionAnswerDto: CreateCareerReflectionAnswerDto,
  ) {
    return this.careerReflectionAnswersService.create(
      createCareerReflectionAnswerDto,
    );
  }

  @Get()
  @ApiOkResponse({
    type: InfinityPaginationResponse(CareerReflectionAnswer),
  })
  async findAll(
    @Query() query: FindAllCareerReflectionAnswersDto,
  ): Promise<InfinityPaginationResponseDto<CareerReflectionAnswer>> {
    const page = query?.page ?? 1;
    let limit = query?.limit ?? 10;
    if (limit > 50) {
      limit = 50;
    }

    return infinityPagination(
      await this.careerReflectionAnswersService.findAllWithPagination({
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
    type: CareerReflectionAnswer,
  })
  findById(@Param('id') id: string) {
    return this.careerReflectionAnswersService.findById(id);
  }

  @Patch(':id')
  @ApiParam({
    name: 'id',
    type: String,
    required: true,
  })
  @ApiOkResponse({
    type: CareerReflectionAnswer,
  })
  update(
    @Param('id') id: string,
    @Body() updateCareerReflectionAnswerDto: UpdateCareerReflectionAnswerDto,
  ) {
    return this.careerReflectionAnswersService.update(
      id,
      updateCareerReflectionAnswerDto,
    );
  }

  @Delete(':id')
  @ApiParam({
    name: 'id',
    type: String,
    required: true,
  })
  remove(@Param('id') id: string) {
    return this.careerReflectionAnswersService.remove(id);
  }
}
