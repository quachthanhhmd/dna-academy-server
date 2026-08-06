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
import { CourseTargetLearnersService } from './course-target-learners.service';
import { CreateCourseTargetLearnerDto } from './dto/create-course-target-learner.dto';
import { UpdateCourseTargetLearnerDto } from './dto/update-course-target-learner.dto';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { CourseTargetLearner } from './domain/course-target-learner';
import { AuthGuard } from '@nestjs/passport';
import {
  InfinityPaginationResponse,
  InfinityPaginationResponseDto,
} from '../utils/dto/infinity-pagination-response.dto';
import { infinityPagination } from '../utils/infinity-pagination';
import { FindAllCourseTargetLearnersDto } from './dto/find-all-course-target-learners.dto';

@ApiTags('Coursetargetlearners')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller({
  path: 'course-target-learners',
  version: '1',
})
export class CourseTargetLearnersController {
  constructor(
    private readonly courseTargetLearnersService: CourseTargetLearnersService,
  ) {}

  @Post()
  @ApiCreatedResponse({
    type: CourseTargetLearner,
  })
  create(@Body() createCourseTargetLearnerDto: CreateCourseTargetLearnerDto) {
    return this.courseTargetLearnersService.create(
      createCourseTargetLearnerDto,
    );
  }

  @Get()
  @ApiOkResponse({
    type: InfinityPaginationResponse(CourseTargetLearner),
  })
  async findAll(
    @Query() query: FindAllCourseTargetLearnersDto,
  ): Promise<InfinityPaginationResponseDto<CourseTargetLearner>> {
    const page = query?.page ?? 1;
    let limit = query?.limit ?? 10;
    if (limit > 50) {
      limit = 50;
    }

    return infinityPagination(
      await this.courseTargetLearnersService.findAllWithPagination({
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
    type: CourseTargetLearner,
  })
  findById(@Param('id') id: string) {
    return this.courseTargetLearnersService.findById(id);
  }

  @Patch(':id')
  @ApiParam({
    name: 'id',
    type: String,
    required: true,
  })
  @ApiOkResponse({
    type: CourseTargetLearner,
  })
  update(
    @Param('id') id: string,
    @Body() updateCourseTargetLearnerDto: UpdateCourseTargetLearnerDto,
  ) {
    return this.courseTargetLearnersService.update(
      id,
      updateCourseTargetLearnerDto,
    );
  }

  @Delete(':id')
  @ApiParam({
    name: 'id',
    type: String,
    required: true,
  })
  remove(@Param('id') id: string) {
    return this.courseTargetLearnersService.remove(id);
  }
}
