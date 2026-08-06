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
import { LectureContentDocumentsService } from './lecture-content-documents.service';
import { CreateLectureContentDocumentDto } from './dto/create-lecture-content-document.dto';
import { UpdateLectureContentDocumentDto } from './dto/update-lecture-content-document.dto';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { LectureContentDocument } from './domain/lecture-content-document';
import { AuthGuard } from '@nestjs/passport';
import {
  InfinityPaginationResponse,
  InfinityPaginationResponseDto,
} from '../utils/dto/infinity-pagination-response.dto';
import { infinityPagination } from '../utils/infinity-pagination';
import { FindAllLectureContentDocumentsDto } from './dto/find-all-lecture-content-documents.dto';

@ApiTags('Lecturecontentdocuments')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller({
  path: 'lecture-content-documents',
  version: '1',
})
export class LectureContentDocumentsController {
  constructor(
    private readonly lectureContentDocumentsService: LectureContentDocumentsService,
  ) {}

  @Post()
  @ApiCreatedResponse({
    type: LectureContentDocument,
  })
  create(
    @Body() createLectureContentDocumentDto: CreateLectureContentDocumentDto,
  ) {
    return this.lectureContentDocumentsService.create(
      createLectureContentDocumentDto,
    );
  }

  @Get()
  @ApiOkResponse({
    type: InfinityPaginationResponse(LectureContentDocument),
  })
  async findAll(
    @Query() query: FindAllLectureContentDocumentsDto,
  ): Promise<InfinityPaginationResponseDto<LectureContentDocument>> {
    const page = query?.page ?? 1;
    let limit = query?.limit ?? 10;
    if (limit > 50) {
      limit = 50;
    }

    return infinityPagination(
      await this.lectureContentDocumentsService.findAllWithPagination({
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
    type: LectureContentDocument,
  })
  findById(@Param('id') id: string) {
    return this.lectureContentDocumentsService.findById(id);
  }

  @Patch(':id')
  @ApiParam({
    name: 'id',
    type: String,
    required: true,
  })
  @ApiOkResponse({
    type: LectureContentDocument,
  })
  update(
    @Param('id') id: string,
    @Body() updateLectureContentDocumentDto: UpdateLectureContentDocumentDto,
  ) {
    return this.lectureContentDocumentsService.update(
      id,
      updateLectureContentDocumentDto,
    );
  }

  @Delete(':id')
  @ApiParam({
    name: 'id',
    type: String,
    required: true,
  })
  remove(@Param('id') id: string) {
    return this.lectureContentDocumentsService.remove(id);
  }
}
