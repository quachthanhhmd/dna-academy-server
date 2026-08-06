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
import { CourseRequirementsService } from './course-requirements.service';
import { CreateCourseRequirementDto } from './dto/create-course-requirement.dto';
import { UpdateCourseRequirementDto } from './dto/update-course-requirement.dto';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { CourseRequirement } from './domain/course-requirement';
import { AuthGuard } from '@nestjs/passport';
import {
  InfinityPaginationResponse,
  InfinityPaginationResponseDto,
} from '../utils/dto/infinity-pagination-response.dto';
import { infinityPagination } from '../utils/infinity-pagination';
import { FindAllCourseRequirementsDto } from './dto/find-all-course-requirements.dto';

@ApiTags('Courserequirements')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller({
  path: 'course-requirements',
  version: '1',
})
export class CourseRequirementsController {
  constructor(
    private readonly courseRequirementsService: CourseRequirementsService,
  ) {}

  @Post()
  @ApiCreatedResponse({
    type: CourseRequirement,
  })
  create(@Body() createCourseRequirementDto: CreateCourseRequirementDto) {
    return this.courseRequirementsService.create(createCourseRequirementDto);
  }

  @Get()
  @ApiOkResponse({
    type: InfinityPaginationResponse(CourseRequirement),
  })
  async findAll(
    @Query() query: FindAllCourseRequirementsDto,
  ): Promise<InfinityPaginationResponseDto<CourseRequirement>> {
    const page = query?.page ?? 1;
    let limit = query?.limit ?? 10;
    if (limit > 50) {
      limit = 50;
    }

    return infinityPagination(
      await this.courseRequirementsService.findAllWithPagination({
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
    type: CourseRequirement,
  })
  findById(@Param('id') id: string) {
    return this.courseRequirementsService.findById(id);
  }

  @Patch(':id')
  @ApiParam({
    name: 'id',
    type: String,
    required: true,
  })
  @ApiOkResponse({
    type: CourseRequirement,
  })
  update(
    @Param('id') id: string,
    @Body() updateCourseRequirementDto: UpdateCourseRequirementDto,
  ) {
    return this.courseRequirementsService.update(
      id,
      updateCourseRequirementDto,
    );
  }

  @Delete(':id')
  @ApiParam({
    name: 'id',
    type: String,
    required: true,
  })
  remove(@Param('id') id: string) {
    return this.courseRequirementsService.remove(id);
  }
}
