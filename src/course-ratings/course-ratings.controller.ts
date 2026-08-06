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
import { CourseRatingsService } from './course-ratings.service';
import { CreateCourseRatingDto } from './dto/create-course-rating.dto';
import { UpdateCourseRatingDto } from './dto/update-course-rating.dto';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { CourseRating } from './domain/course-rating';
import { AuthGuard } from '@nestjs/passport';
import {
  InfinityPaginationResponse,
  InfinityPaginationResponseDto,
} from '../utils/dto/infinity-pagination-response.dto';
import { infinityPagination } from '../utils/infinity-pagination';
import { FindAllCourseRatingsDto } from './dto/find-all-course-ratings.dto';

@ApiTags('Courseratings')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller({
  path: 'course-ratings',
  version: '1',
})
export class CourseRatingsController {
  constructor(private readonly courseRatingsService: CourseRatingsService) {}

  @Post()
  @ApiCreatedResponse({
    type: CourseRating,
  })
  create(@Body() createCourseRatingDto: CreateCourseRatingDto) {
    return this.courseRatingsService.create(createCourseRatingDto);
  }

  @Get()
  @ApiOkResponse({
    type: InfinityPaginationResponse(CourseRating),
  })
  async findAll(
    @Query() query: FindAllCourseRatingsDto,
  ): Promise<InfinityPaginationResponseDto<CourseRating>> {
    const page = query?.page ?? 1;
    let limit = query?.limit ?? 10;
    if (limit > 50) {
      limit = 50;
    }

    return infinityPagination(
      await this.courseRatingsService.findAllWithPagination({
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
    type: CourseRating,
  })
  findById(@Param('id') id: string) {
    return this.courseRatingsService.findById(id);
  }

  @Patch(':id')
  @ApiParam({
    name: 'id',
    type: String,
    required: true,
  })
  @ApiOkResponse({
    type: CourseRating,
  })
  update(
    @Param('id') id: string,
    @Body() updateCourseRatingDto: UpdateCourseRatingDto,
  ) {
    return this.courseRatingsService.update(id, updateCourseRatingDto);
  }

  @Delete(':id')
  @ApiParam({
    name: 'id',
    type: String,
    required: true,
  })
  remove(@Param('id') id: string) {
    return this.courseRatingsService.remove(id);
  }
}
