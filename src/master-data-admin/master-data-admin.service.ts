import {
  ConflictException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MasterDataGroupsService } from '../master-data-groups/master-data-groups.service';
import { MasterDataGroup } from '../master-data-groups/domain/master-data-group';
import { MasterDataCodesService } from '../master-data-codes/master-data-codes.service';
import { MasterDataCode } from '../master-data-codes/domain/master-data-code';
import { CoursesService } from '../courses/courses.service';
import { CourseGroupAssignmentsService } from '../course-group-assignments/course-group-assignments.service';
import { CreateMasterDataAdminCodeDto } from './dto/create-master-data-admin-code.dto';
import { UpdateMasterDataAdminCodeDto } from './dto/update-master-data-admin-code.dto';
import { MasterDataCodeWithCountDto } from './dto/master-data-code-with-count.dto';

@Injectable()
export class MasterDataAdminService {
  constructor(
    private readonly masterDataGroupsService: MasterDataGroupsService,
    private readonly masterDataCodesService: MasterDataCodesService,
    private readonly coursesService: CoursesService,
    private readonly courseGroupAssignmentsService: CourseGroupAssignmentsService,
  ) {}

  findAllGroups(): Promise<MasterDataGroup[]> {
    return this.masterDataGroupsService.findAllWithPagination({
      paginationOptions: { page: 1, limit: 50 },
    });
  }

  async findCodesForGroup(
    groupKey: string,
  ): Promise<MasterDataCodeWithCountDto[]> {
    await this.findGroupOrThrow(groupKey);

    const codes = await this.masterDataCodesService.findAllWithPagination({
      filterOptions: { groupKey },
      paginationOptions: { page: 1, limit: 50 },
    });

    return Promise.all(
      codes.map(async (code) => ({
        ...code,
        linkedCoursesCount: await this.countLinkedCourses(code.id),
      })),
    );
  }

  async createCode(
    groupKey: string,
    dto: CreateMasterDataAdminCodeDto,
  ): Promise<MasterDataCode> {
    const group = await this.findGroupOrThrow(groupKey);

    await this.assertNameUnique(group.id, dto.name);

    return this.masterDataCodesService.create({
      code: dto.code,
      name: dto.name,
      description: dto.description,
      thumbnailUrl: dto.thumbnailUrl,
      isActive: dto.isActive ?? true,
      displayOrder: dto.displayOrder ?? 0,
      group,
    });
  }

  async updateCode(
    groupKey: string,
    id: MasterDataCode['id'],
    dto: UpdateMasterDataAdminCodeDto,
  ): Promise<MasterDataCode | null> {
    const group = await this.findGroupOrThrow(groupKey);
    const code = await this.findCodeInGroupOrThrow(group, id);

    if (dto.name && dto.name !== code.name) {
      await this.assertNameUnique(group.id, dto.name);
    }

    return this.masterDataCodesService.update(id, dto);
  }

  async deactivateCode(
    groupKey: string,
    id: MasterDataCode['id'],
  ): Promise<MasterDataCode | null> {
    const group = await this.findGroupOrThrow(groupKey);
    await this.findCodeInGroupOrThrow(group, id);

    return this.masterDataCodesService.update(id, { isActive: false });
  }

  private async countLinkedCourses(
    codeId: MasterDataCode['id'],
  ): Promise<number> {
    const [byLevel, byCategory, byGroupAssignment] = await Promise.all([
      this.coursesService.countByLevelId(codeId),
      this.coursesService.countByCategoryId(codeId),
      this.courseGroupAssignmentsService.countByGroupId(codeId),
    ]);

    return byLevel + byCategory + byGroupAssignment;
  }

  private async assertNameUnique(
    groupId: MasterDataGroup['id'],
    name: string,
  ): Promise<void> {
    const existing = await this.masterDataCodesService.findByGroupIdAndName(
      groupId,
      name,
    );

    if (existing) {
      throw new ConflictException({
        status: HttpStatus.CONFLICT,
        errors: { name: 'codeNameExistsInGroup' },
      });
    }
  }

  private async findGroupOrThrow(groupKey: string): Promise<MasterDataGroup> {
    const group = await this.masterDataGroupsService.findByGroupKey(groupKey);

    if (!group) {
      throw new NotFoundException({
        status: HttpStatus.NOT_FOUND,
        error: 'masterDataGroupNotFound',
      });
    }

    return group;
  }

  private async findCodeInGroupOrThrow(
    group: MasterDataGroup,
    id: MasterDataCode['id'],
  ): Promise<MasterDataCode> {
    const code = await this.masterDataCodesService.findById(id);

    if (!code || code.group.id !== group.id) {
      throw new NotFoundException({
        status: HttpStatus.NOT_FOUND,
        error: 'masterDataCodeNotFound',
      });
    }

    return code;
  }
}
