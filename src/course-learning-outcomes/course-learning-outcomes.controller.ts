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
import { CourseLearningOutcomesService } from './course-learning-outcomes.service';
import { CreateCourseLearningOutcomeDto } from './dto/create-course-learning-outcome.dto';
import { UpdateCourseLearningOutcomeDto } from './dto/update-course-learning-outcome.dto';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { CourseLearningOutcome } from './domain/course-learning-outcome';
import { AuthGuard } from '@nestjs/passport';
import {
  InfinityPaginationResponse,
  InfinityPaginationResponseDto,
} from '../utils/dto/infinity-pagination-response.dto';
import { infinityPagination } from '../utils/infinity-pagination';
import { FindAllCourseLearningOutcomesDto } from './dto/find-all-course-learning-outcomes.dto';

@ApiTags('Courselearningoutcomes')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller({
  path: 'course-learning-outcomes',
  version: '1',
})
export class CourseLearningOutcomesController {
  constructor(
    private readonly courseLearningOutcomesService: CourseLearningOutcomesService,
  ) {}

  @Post()
  @ApiCreatedResponse({
    type: CourseLearningOutcome,
  })
  create(
    @Body() createCourseLearningOutcomeDto: CreateCourseLearningOutcomeDto,
  ) {
    return this.courseLearningOutcomesService.create(
      createCourseLearningOutcomeDto,
    );
  }

  @Get()
  @ApiOkResponse({
    type: InfinityPaginationResponse(CourseLearningOutcome),
  })
  async findAll(
    @Query() query: FindAllCourseLearningOutcomesDto,
  ): Promise<InfinityPaginationResponseDto<CourseLearningOutcome>> {
    const page = query?.page ?? 1;
    let limit = query?.limit ?? 10;
    if (limit > 50) {
      limit = 50;
    }

    return infinityPagination(
      await this.courseLearningOutcomesService.findAllWithPagination({
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
    type: CourseLearningOutcome,
  })
  findById(@Param('id') id: string) {
    return this.courseLearningOutcomesService.findById(id);
  }

  @Patch(':id')
  @ApiParam({
    name: 'id',
    type: String,
    required: true,
  })
  @ApiOkResponse({
    type: CourseLearningOutcome,
  })
  update(
    @Param('id') id: string,
    @Body() updateCourseLearningOutcomeDto: UpdateCourseLearningOutcomeDto,
  ) {
    return this.courseLearningOutcomesService.update(
      id,
      updateCourseLearningOutcomeDto,
    );
  }

  @Delete(':id')
  @ApiParam({
    name: 'id',
    type: String,
    required: true,
  })
  remove(@Param('id') id: string) {
    return this.courseLearningOutcomesService.remove(id);
  }
}
