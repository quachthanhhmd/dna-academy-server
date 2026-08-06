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
import { StudentProfilesService } from './student-profiles.service';
import { CreateStudentProfileDto } from './dto/create-student-profile.dto';
import { UpdateStudentProfileDto } from './dto/update-student-profile.dto';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { StudentProfile } from './domain/student-profile';
import { AuthGuard } from '@nestjs/passport';
import {
  InfinityPaginationResponse,
  InfinityPaginationResponseDto,
} from '../utils/dto/infinity-pagination-response.dto';
import { infinityPagination } from '../utils/infinity-pagination';
import { FindAllStudentProfilesDto } from './dto/find-all-student-profiles.dto';

@ApiTags('Studentprofiles')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller({
  path: 'student-profiles',
  version: '1',
})
export class StudentProfilesController {
  constructor(
    private readonly studentProfilesService: StudentProfilesService,
  ) {}

  @Post()
  @ApiCreatedResponse({
    type: StudentProfile,
  })
  create(@Body() createStudentProfileDto: CreateStudentProfileDto) {
    return this.studentProfilesService.create(createStudentProfileDto);
  }

  @Get()
  @ApiOkResponse({
    type: InfinityPaginationResponse(StudentProfile),
  })
  async findAll(
    @Query() query: FindAllStudentProfilesDto,
  ): Promise<InfinityPaginationResponseDto<StudentProfile>> {
    const page = query?.page ?? 1;
    let limit = query?.limit ?? 10;
    if (limit > 50) {
      limit = 50;
    }

    return infinityPagination(
      await this.studentProfilesService.findAllWithPagination({
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
    type: StudentProfile,
  })
  findById(@Param('id') id: string) {
    return this.studentProfilesService.findById(id);
  }

  @Patch(':id')
  @ApiParam({
    name: 'id',
    type: String,
    required: true,
  })
  @ApiOkResponse({
    type: StudentProfile,
  })
  update(
    @Param('id') id: string,
    @Body() updateStudentProfileDto: UpdateStudentProfileDto,
  ) {
    return this.studentProfilesService.update(id, updateStudentProfileDto);
  }

  @Delete(':id')
  @ApiParam({
    name: 'id',
    type: String,
    required: true,
  })
  remove(@Param('id') id: string) {
    return this.studentProfilesService.remove(id);
  }
}
