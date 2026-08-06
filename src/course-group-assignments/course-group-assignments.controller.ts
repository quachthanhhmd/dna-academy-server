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
import { CourseGroupAssignmentsService } from './course-group-assignments.service';
import { CreateCourseGroupAssignmentDto } from './dto/create-course-group-assignment.dto';
import { UpdateCourseGroupAssignmentDto } from './dto/update-course-group-assignment.dto';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { CourseGroupAssignment } from './domain/course-group-assignment';
import { AuthGuard } from '@nestjs/passport';
import {
  InfinityPaginationResponse,
  InfinityPaginationResponseDto,
} from '../utils/dto/infinity-pagination-response.dto';
import { infinityPagination } from '../utils/infinity-pagination';
import { FindAllCourseGroupAssignmentsDto } from './dto/find-all-course-group-assignments.dto';

@ApiTags('Coursegroupassignments')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller({
  path: 'course-group-assignments',
  version: '1',
})
export class CourseGroupAssignmentsController {
  constructor(
    private readonly courseGroupAssignmentsService: CourseGroupAssignmentsService,
  ) {}

  @Post()
  @ApiCreatedResponse({
    type: CourseGroupAssignment,
  })
  create(
    @Body() createCourseGroupAssignmentDto: CreateCourseGroupAssignmentDto,
  ) {
    return this.courseGroupAssignmentsService.create(
      createCourseGroupAssignmentDto,
    );
  }

  @Get()
  @ApiOkResponse({
    type: InfinityPaginationResponse(CourseGroupAssignment),
  })
  async findAll(
    @Query() query: FindAllCourseGroupAssignmentsDto,
  ): Promise<InfinityPaginationResponseDto<CourseGroupAssignment>> {
    const page = query?.page ?? 1;
    let limit = query?.limit ?? 10;
    if (limit > 50) {
      limit = 50;
    }

    return infinityPagination(
      await this.courseGroupAssignmentsService.findAllWithPagination({
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
    type: CourseGroupAssignment,
  })
  findById(@Param('id') id: string) {
    return this.courseGroupAssignmentsService.findById(id);
  }

  @Patch(':id')
  @ApiParam({
    name: 'id',
    type: String,
    required: true,
  })
  @ApiOkResponse({
    type: CourseGroupAssignment,
  })
  update(
    @Param('id') id: string,
    @Body() updateCourseGroupAssignmentDto: UpdateCourseGroupAssignmentDto,
  ) {
    return this.courseGroupAssignmentsService.update(
      id,
      updateCourseGroupAssignmentDto,
    );
  }

  @Delete(':id')
  @ApiParam({
    name: 'id',
    type: String,
    required: true,
  })
  remove(@Param('id') id: string) {
    return this.courseGroupAssignmentsService.remove(id);
  }
}
