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
import { StudentCareerInterestsService } from './student-career-interests.service';
import { CreateStudentCareerInterestDto } from './dto/create-student-career-interest.dto';
import { UpdateStudentCareerInterestDto } from './dto/update-student-career-interest.dto';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { StudentCareerInterest } from './domain/student-career-interest';
import { AuthGuard } from '@nestjs/passport';
import {
  InfinityPaginationResponse,
  InfinityPaginationResponseDto,
} from '../utils/dto/infinity-pagination-response.dto';
import { infinityPagination } from '../utils/infinity-pagination';
import { FindAllStudentCareerInterestsDto } from './dto/find-all-student-career-interests.dto';

@ApiTags('Studentcareerinterests')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller({
  path: 'student-career-interests',
  version: '1',
})
export class StudentCareerInterestsController {
  constructor(
    private readonly studentCareerInterestsService: StudentCareerInterestsService,
  ) {}

  @Post()
  @ApiCreatedResponse({
    type: StudentCareerInterest,
  })
  create(
    @Body() createStudentCareerInterestDto: CreateStudentCareerInterestDto,
  ) {
    return this.studentCareerInterestsService.create(
      createStudentCareerInterestDto,
    );
  }

  @Get()
  @ApiOkResponse({
    type: InfinityPaginationResponse(StudentCareerInterest),
  })
  async findAll(
    @Query() query: FindAllStudentCareerInterestsDto,
  ): Promise<InfinityPaginationResponseDto<StudentCareerInterest>> {
    const page = query?.page ?? 1;
    let limit = query?.limit ?? 10;
    if (limit > 50) {
      limit = 50;
    }

    return infinityPagination(
      await this.studentCareerInterestsService.findAllWithPagination({
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
    type: StudentCareerInterest,
  })
  findById(@Param('id') id: string) {
    return this.studentCareerInterestsService.findById(id);
  }

  @Patch(':id')
  @ApiParam({
    name: 'id',
    type: String,
    required: true,
  })
  @ApiOkResponse({
    type: StudentCareerInterest,
  })
  update(
    @Param('id') id: string,
    @Body() updateStudentCareerInterestDto: UpdateStudentCareerInterestDto,
  ) {
    return this.studentCareerInterestsService.update(
      id,
      updateStudentCareerInterestDto,
    );
  }

  @Delete(':id')
  @ApiParam({
    name: 'id',
    type: String,
    required: true,
  })
  remove(@Param('id') id: string) {
    return this.studentCareerInterestsService.remove(id);
  }
}
