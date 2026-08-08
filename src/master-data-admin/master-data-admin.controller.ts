import {
  Body,
  Controller,
  Get,
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
} from '@nestjs/swagger';
import { MasterDataAdminService } from './master-data-admin.service';
import { PermissionGuard } from '../authorization/permission.guard';
import { RequirePermission } from '../authorization/require-permission.decorator';
import { MasterDataGroup } from '../master-data-groups/domain/master-data-group';
import { MasterDataCode } from '../master-data-codes/domain/master-data-code';
import { MasterDataCodeWithCountDto } from './dto/master-data-code-with-count.dto';
import { CreateMasterDataAdminCodeDto } from './dto/create-master-data-admin-code.dto';
import { UpdateMasterDataAdminCodeDto } from './dto/update-master-data-admin-code.dto';

@ApiTags('Admin / Master Data')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), PermissionGuard)
@Controller({
  path: 'admin/master-data',
  version: '1',
})
export class MasterDataAdminController {
  constructor(
    private readonly masterDataAdminService: MasterDataAdminService,
  ) {}

  @ApiOperation({
    summary: 'List all master data groups (read-only in V1)',
  })
  @RequirePermission('master_data', 'view')
  @Get('groups')
  @ApiOkResponse({ type: [MasterDataGroup] })
  findGroups(): Promise<MasterDataGroup[]> {
    return this.masterDataAdminService.findAllGroups();
  }

  @ApiOperation({
    summary: 'List codes for a group, with linkedCoursesCount',
  })
  @RequirePermission('master_data', 'view')
  @Get('groups/:groupKey/codes')
  @ApiParam({ name: 'groupKey', type: String })
  @ApiOkResponse({ type: [MasterDataCodeWithCountDto] })
  @ApiNotFoundResponse()
  findCodes(
    @Param('groupKey') groupKey: string,
  ): Promise<MasterDataCodeWithCountDto[]> {
    return this.masterDataAdminService.findCodesForGroup(groupKey);
  }

  @ApiOperation({ summary: 'Create a code within a group' })
  @RequirePermission('master_data', 'create')
  @Post('groups/:groupKey/codes')
  @ApiParam({ name: 'groupKey', type: String })
  @ApiCreatedResponse({ type: MasterDataCode })
  @ApiNotFoundResponse()
  @ApiConflictResponse({
    description: 'A code with this name already exists in the group',
  })
  createCode(
    @Param('groupKey') groupKey: string,
    @Body() dto: CreateMasterDataAdminCodeDto,
  ): Promise<MasterDataCode> {
    return this.masterDataAdminService.createCode(groupKey, dto);
  }

  @ApiOperation({ summary: 'Update a code' })
  @RequirePermission('master_data', 'edit')
  @Patch('groups/:groupKey/codes/:id')
  @ApiParam({ name: 'groupKey', type: String })
  @ApiParam({ name: 'id', type: String })
  @ApiOkResponse({ type: MasterDataCode })
  @ApiNotFoundResponse()
  @ApiConflictResponse({
    description: 'A code with this name already exists in the group',
  })
  updateCode(
    @Param('groupKey') groupKey: string,
    @Param('id') id: string,
    @Body() dto: UpdateMasterDataAdminCodeDto,
  ): Promise<MasterDataCode | null> {
    return this.masterDataAdminService.updateCode(groupKey, id, dto);
  }

  @ApiOperation({
    summary: 'Deactivate a code',
    description:
      'Sets isActive=false. Existing course relations are preserved; the code is no longer selectable for new assignments (see the public GET /master-data/codes endpoint).',
  })
  @RequirePermission('master_data', 'edit')
  @Patch('groups/:groupKey/codes/:id/deactivate')
  @ApiParam({ name: 'groupKey', type: String })
  @ApiParam({ name: 'id', type: String })
  @ApiOkResponse({ type: MasterDataCode })
  @ApiNotFoundResponse()
  deactivateCode(
    @Param('groupKey') groupKey: string,
    @Param('id') id: string,
  ): Promise<MasterDataCode | null> {
    return this.masterDataAdminService.deactivateCode(groupKey, id);
  }
}
