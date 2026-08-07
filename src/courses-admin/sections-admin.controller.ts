import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { SectionsAdminService } from './sections-admin.service';
import { PermissionGuard } from '../authorization/permission.guard';
import { RequirePermission } from '../authorization/require-permission.decorator';
import { CreateSectionAdminDto } from './dto/create-section-admin.dto';
import { UpdateSectionAdminDto } from './dto/update-section-admin.dto';
import { ReorderItemsDto } from './dto/reorder-items.dto';
import { DeleteSectionDto } from './dto/delete-section.dto';
import { Section } from '../sections/domain/section';

@ApiTags('Admin / Courses')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), PermissionGuard)
@Controller({
  path: 'admin/courses/:courseId/sections',
  version: '1',
})
export class SectionsAdminController {
  constructor(private readonly sectionsAdminService: SectionsAdminService) {}

  @ApiOperation({
    summary: 'List sections for a course, ordered by displayOrder',
  })
  @RequirePermission('courses', 'view')
  @Get()
  @ApiParam({ name: 'courseId', type: String })
  @ApiOkResponse({ type: [Section] })
  @ApiNotFoundResponse()
  findAll(@Param('courseId') courseId: string) {
    return this.sectionsAdminService.findAllForCourse(courseId);
  }

  @ApiOperation({ summary: 'Create a section' })
  @RequirePermission('courses', 'edit')
  @Post()
  @ApiParam({ name: 'courseId', type: String })
  @ApiCreatedResponse({ type: Section })
  @ApiNotFoundResponse()
  create(
    @Param('courseId') courseId: string,
    @Body() dto: CreateSectionAdminDto,
  ) {
    return this.sectionsAdminService.create(courseId, dto);
  }

  @ApiOperation({
    summary: 'Reorder sections',
    description:
      "orderedIds must be exactly the course's current section ids, in the desired order.",
  })
  @RequirePermission('courses', 'edit')
  @Patch('reorder')
  @ApiParam({ name: 'courseId', type: String })
  @ApiOkResponse({ type: [Section] })
  @ApiNotFoundResponse()
  @ApiUnprocessableEntityResponse({
    description: "orderedIds does not match the course's current sections",
  })
  reorder(@Param('courseId') courseId: string, @Body() dto: ReorderItemsDto) {
    return this.sectionsAdminService.reorder(courseId, dto.orderedIds);
  }

  @ApiOperation({ summary: 'Update a section' })
  @RequirePermission('courses', 'edit')
  @Patch(':id')
  @ApiParam({ name: 'courseId', type: String })
  @ApiParam({ name: 'id', type: String })
  @ApiOkResponse({ type: Section })
  @ApiNotFoundResponse()
  update(
    @Param('courseId') courseId: string,
    @Param('id') id: string,
    @Body() dto: UpdateSectionAdminDto,
  ) {
    return this.sectionsAdminService.update(courseId, id, dto);
  }

  @ApiOperation({
    summary: 'Delete a section',
    description:
      'If the section has lectures, the request body must include { force: true } to cascade-delete them; otherwise this returns 409 SECTION_HAS_LECTURES.',
  })
  @RequirePermission('courses', 'delete')
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiParam({ name: 'courseId', type: String })
  @ApiParam({ name: 'id', type: String })
  @ApiNotFoundResponse()
  @ApiConflictResponse({
    description: 'Section has lectures and force was not set',
  })
  remove(
    @Param('courseId') courseId: string,
    @Param('id') id: string,
    @Body() dto: DeleteSectionDto,
  ) {
    return this.sectionsAdminService.remove(courseId, id, dto.force === true);
  }
}
