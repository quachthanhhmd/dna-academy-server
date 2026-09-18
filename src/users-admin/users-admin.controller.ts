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
  HttpStatus,
  HttpCode,
  SerializeOptions,
  ParseIntPipe,
  Request,
} from '@nestjs/common';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { AdminUpdateUserDto } from './dto/admin-update-user.dto';
import { SetUserStatusDto } from './dto/set-user-status.dto';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';

import {
  InfinityPaginationResponse,
  InfinityPaginationResponseDto,
} from '../utils/dto/infinity-pagination-response.dto';
import { NullableType } from '../utils/types/nullable.type';
import { QueryUserDto } from '../users/dto/query-user.dto';
import { User } from '../users/domain/user';
import { UsersService } from '../users/users.service';
import { PermissionGuard } from '../authorization/permission.guard';
import { RequirePermission } from '../authorization/require-permission.decorator';
import { UsersAdminService } from './users-admin.service';
import { infinityPagination } from '../utils/infinity-pagination';

/**
 * The Students screen (permission model §1.6). Authorized by permission on
 * every request — never by a role carried in the token.
 */
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), PermissionGuard)
@ApiTags('Users')
@Controller({
  path: 'users',
  version: '1',
})
export class UsersAdminController {
  constructor(
    private readonly usersService: UsersService,
    private readonly usersAdminService: UsersAdminService,
  ) {}

  @ApiCreatedResponse({
    type: User,
  })
  @SerializeOptions({
    groups: ['admin'],
  })
  @RequirePermission('users', 'create')
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @Body() createProfileDto: CreateUserDto,
    @Request() request,
  ): Promise<User> {
    return this.usersAdminService.create(createProfileDto, request.user.id);
  }

  @ApiOkResponse({
    type: InfinityPaginationResponse(User),
  })
  @SerializeOptions({
    groups: ['admin'],
  })
  @RequirePermission('users', 'view')
  @Get()
  @HttpCode(HttpStatus.OK)
  async findAll(
    @Query() query: QueryUserDto,
  ): Promise<InfinityPaginationResponseDto<User>> {
    const page = query?.page ?? 1;
    let limit = query?.limit ?? 10;
    if (limit > 50) {
      limit = 50;
    }

    return infinityPagination(
      await this.usersService.findManyWithPagination({
        filterOptions: query?.filters,
        sortOptions: query?.sort,
        paginationOptions: {
          page,
          limit,
        },
      }),
      { page, limit },
    );
  }

  @ApiOkResponse({
    type: User,
  })
  @SerializeOptions({
    groups: ['admin'],
  })
  @RequirePermission('users', 'view')
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiParam({
    name: 'id',
    type: String,
    required: true,
  })
  findOne(@Param('id') id: User['id']): Promise<NullableType<User>> {
    return this.usersService.findById(id);
  }

  @ApiOkResponse({
    type: User,
  })
  @SerializeOptions({
    groups: ['admin'],
  })
  @ApiOperation({
    summary: 'Edit a non-learner profile',
    description:
      '403 STUDENT_PROFILE_IMMUTABLE when the user is a learner. Role, email, ' +
      'password and status are ignored — they have their own endpoints.',
  })
  @RequirePermission('users', 'edit')
  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiParam({
    name: 'id',
    type: Number,
    required: true,
  })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateProfileDto: AdminUpdateUserDto,
    @Request() request,
  ): Promise<User | null> {
    return this.usersAdminService.update(request.user.id, id, updateProfileDto);
  }

  @ApiOkResponse({
    type: User,
  })
  @SerializeOptions({
    groups: ['admin'],
  })
  @ApiOperation({
    summary: 'Activate or deactivate an account (D9)',
    description:
      'Deactivating ends every session and blocks sign-in. 409 ' +
      'cannot_change_own_status.',
  })
  @RequirePermission('users', 'edit')
  @Patch(':id/status')
  @HttpCode(HttpStatus.OK)
  @ApiParam({ name: 'id', type: Number, required: true })
  setStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SetUserStatusDto,
    @Request() request,
  ): Promise<User | null> {
    return this.usersAdminService.setStatus(request.user.id, id, dto.statusId);
  }

  @RequirePermission('users', 'delete')
  @Delete(':id')
  @ApiParam({
    name: 'id',
    type: Number,
    required: true,
  })
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Param('id', ParseIntPipe) id: number,
    @Request() request,
  ): Promise<void> {
    return this.usersAdminService.remove(request.user.id, id);
  }
}
