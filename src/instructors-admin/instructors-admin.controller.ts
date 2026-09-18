import {
  RateLimit,
  RateLimitGuard,
} from '../utils/rate-limit/rate-limit.guard';
import { HOUR } from '../utils/rate-limit/rate-limit.constants';
import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { InstructorsAdminService } from './instructors-admin.service';
import { InstructorStatsService } from './instructor-stats.service';
import { PermissionGuard } from '../authorization/permission.guard';
import { RequirePermission } from '../authorization/require-permission.decorator';
import { AuthorizationService } from '../authorization/authorization.service';
import { CreateInstructorDto } from './dto/create-instructor.dto';
import { UpdateInstructorDto } from './dto/update-instructor.dto';
import { UpdateInstructorStatusDto } from './dto/update-instructor-status.dto';
import { LinkInstructorUserDto } from './dto/link-instructor-user.dto';
import { FindAllInstructorsDto } from './dto/find-all-instructors.dto';
import {
  InstructorCourseDto,
  InstructorCreatedDto,
  InstructorDetailDto,
  InstructorFullStatsDto,
} from './dto/instructor-response.dto';

@ApiTags('Admin / Instructors')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), PermissionGuard)
@Controller({
  path: 'admin/instructors',
  version: '1',
})
export class InstructorsAdminController {
  constructor(
    private readonly instructorsAdminService: InstructorsAdminService,
    private readonly instructorStatsService: InstructorStatsService,
    private readonly authorizationService: AuthorizationService,
  ) {}

  @ApiOperation({
    summary: 'List instructors with search, filters, sort and pagination',
    description:
      'q matches fullName and headline. status defaults to all. Sorting is ' +
      'restricted to the whitelisted columns; limit is capped at 50.',
  })
  @RequirePermission('instructors', 'view')
  @Get()
  findAll(@Query() query: FindAllInstructorsDto) {
    return this.instructorsAdminService.findAll(query);
  }

  @ApiOperation({
    summary: 'Get one instructor with expertise, social links and stats',
  })
  @RequirePermission('instructors', 'view')
  @Get(':id')
  @ApiParam({ name: 'id', type: String })
  @ApiOkResponse({ type: InstructorDetailDto })
  @ApiNotFoundResponse()
  findOne(@Param('id') id: string): Promise<InstructorDetailDto> {
    return this.instructorsAdminService.findOne(id);
  }

  @ApiOperation({ summary: 'List the courses this instructor is assigned to' })
  @RequirePermission('instructors', 'view')
  @Get(':id/courses')
  @ApiParam({ name: 'id', type: String })
  @ApiOkResponse({ type: [InstructorCourseDto] })
  @ApiNotFoundResponse()
  findCourses(@Param('id') id: string): Promise<InstructorCourseDto[]> {
    return this.instructorsAdminService.findCourses(id);
  }

  @ApiOperation({
    summary: 'Aggregated stats for this instructor',
    description:
      'Recomputed from course_instructor / enrollment / course.avgRating on ' +
      'every call, and written back onto the denormalized columns.',
  })
  @RequirePermission('instructors', 'view')
  @Get(':id/stats')
  @ApiParam({ name: 'id', type: String })
  @ApiOkResponse({ type: InstructorFullStatsDto })
  @ApiNotFoundResponse()
  getStats(@Param('id') id: string): Promise<InstructorFullStatsDto> {
    return this.instructorStatsService.recompute(id);
  }

  @ApiOperation({
    summary: 'Create an instructor',
    description:
      'slug is derived from fullName when omitted (ASCII-folded kebab-case, ' +
      'suffixed -2/-3/... on collision).',
  })
  @RequirePermission('instructors', 'create')
  @Post()
  @ApiCreatedResponse({ type: InstructorCreatedDto })
  @ApiConflictResponse({ description: 'user_already_linked' })
  @ApiForbiddenResponse({
    description: 'createAccount without instructors:create_account',
  })
  @ApiUnprocessableEntityResponse({
    description:
      'Unknown/inactive expertiseCodeIds, unknown userId, taken slug; with ' +
      'createAccount: accountEmail required / emailAlreadyExists, userId ' +
      'conflictsWithCreateAccount',
  })
  async create(
    @Body() dto: CreateInstructorDto,
    @Request() request,
  ): Promise<InstructorCreatedDto> {
    if (
      dto.createAccount &&
      !(await this.authorizationService.hasPermission(
        request.user.id,
        'instructors',
        'create_account',
      ))
    ) {
      throw new ForbiddenException({
        code: 'PERMISSION_DENIED',
        required: { module: 'instructors', action: 'create_account' },
      });
    }

    return this.instructorsAdminService.create(dto, request.user.id);
  }

  @ApiOperation({
    summary: 'Resend the set-password invite',
    description:
      '409 no_linked_account when the profile has no login account; 409 ' +
      'already_activated once a password has been set.',
  })
  @RequirePermission('instructors', 'create_account')
  // Each call emails someone: 3 an hour to one instructor, 20 an hour from
  // one admin.
  @UseGuards(RateLimitGuard)
  @RateLimit(3, HOUR, { param: 'id' })
  @RateLimit(20, HOUR)
  @Post(':id/invite')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  @ApiNotFoundResponse()
  @ApiConflictResponse()
  invite(@Param('id') id: string): Promise<void> {
    return this.instructorsAdminService.resendInvite(id);
  }

  @ApiOperation({
    summary: 'Update an instructor profile, expertise set and social links',
    description:
      'expertiseCodeIds and socialLinks replace the whole set when present ' +
      'and are left untouched when omitted; an empty array clears them.',
  })
  @RequirePermission('instructors', 'edit')
  @Put(':id')
  @ApiParam({ name: 'id', type: String })
  @ApiOkResponse({ type: InstructorDetailDto })
  @ApiNotFoundResponse()
  @ApiConflictResponse({ description: 'slug_locked or user_already_linked' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateInstructorDto,
  ): Promise<InstructorDetailDto> {
    return this.instructorsAdminService.update(id, dto);
  }

  @ApiOperation({
    summary: 'Activate / deactivate an instructor',
    description:
      'Deactivation preserves existing course assignments and only blocks new ones.',
  })
  @RequirePermission('instructors', 'edit')
  @Patch(':id/status')
  @ApiParam({ name: 'id', type: String })
  @ApiOkResponse({ type: InstructorDetailDto })
  @ApiNotFoundResponse()
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateInstructorStatusDto,
  ): Promise<InstructorDetailDto> {
    return this.instructorsAdminService.updateStatus(id, dto.isActive);
  }

  @ApiOperation({
    summary: 'Link (or unlink, with userId=null) a user account',
  })
  @RequirePermission('instructors', 'edit')
  @Patch(':id/link-user')
  @ApiParam({ name: 'id', type: String })
  @ApiOkResponse({ type: InstructorDetailDto })
  @ApiNotFoundResponse()
  @ApiConflictResponse({ description: 'user_already_linked' })
  linkUser(
    @Param('id') id: string,
    @Body() dto: LinkInstructorUserDto,
  ): Promise<InstructorDetailDto> {
    return this.instructorsAdminService.linkUser(id, dto.userId);
  }

  @ApiOperation({
    summary: 'Delete an instructor',
    description:
      'Only allowed when the instructor has no course assignments; otherwise ' +
      '409 has_assigned_courses with assignedCoursesCount in the payload.',
  })
  @RequirePermission('instructors', 'delete')
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiParam({ name: 'id', type: String })
  @ApiNoContentResponse()
  @ApiNotFoundResponse()
  @ApiConflictResponse({ description: 'has_assigned_courses' })
  remove(@Param('id') id: string): Promise<void> {
    return this.instructorsAdminService.remove(id);
  }
}
