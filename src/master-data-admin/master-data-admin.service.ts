import {
  ConflictException,
  HttpStatus,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { MasterDataGroupsService } from '../master-data-groups/master-data-groups.service';
import { MasterDataGroup } from '../master-data-groups/domain/master-data-group';
import { MasterDataCodesService } from '../master-data-codes/master-data-codes.service';
import { MasterDataCode } from '../master-data-codes/domain/master-data-code';
import { CoursesService } from '../courses/courses.service';
import { CourseGroupAssignmentsService } from '../course-group-assignments/course-group-assignments.service';
import { CreateMasterDataAdminCodeDto } from './dto/create-master-data-admin-code.dto';
import { CreateMasterDataAdminGroupDto } from './dto/create-master-data-admin-group.dto';
import { UpdateMasterDataAdminGroupDto } from './dto/update-master-data-admin-group.dto';
import { UpdateMasterDataAdminCodeDto } from './dto/update-master-data-admin-code.dto';
import { MasterDataCodeWithCountDto } from './dto/master-data-code-with-count.dto';
import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from '../utils/i18n/locale';
import { TranslationMap } from '../utils/i18n/translation-map.type';
import {
  mergeTranslations,
  sanitizeTranslations,
  withDefaultLocale,
} from '../utils/i18n/translations';
import { TranslationCoverageDto } from './dto/translation-coverage.dto';

/**
 * The admin screens render a whole group at once and have no paging control,
 * so these have to be above any realistic count rather than a page size. A cap
 * a real group can exceed hides codes from the person managing them —
 * course_level passed 50 on a working database.
 */
const GROUP_CODE_LIMIT = 1000;
const ALL_GROUPS_LIMIT = 200;
/** Every code of every group, for the batched coverage read. */
const ALL_CODES_LIMIT = 20000;

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
      paginationOptions: { page: 1, limit: ALL_GROUPS_LIMIT },
    });
  }

  /**
   * A new group. The key is unique and permanent; the Vietnamese name is
   * required for the same reason it is on a code — it is every other
   * locale's fallback.
   */
  async createGroup(
    dto: CreateMasterDataAdminGroupDto,
  ): Promise<MasterDataGroup> {
    const existing = await this.masterDataGroupsService.findByGroupKey(
      dto.groupKey,
    );
    if (existing) {
      throw new ConflictException({
        status: HttpStatus.CONFLICT,
        errors: { groupKey: 'groupKeyExists' },
      });
    }

    const nameTranslations = withDefaultLocale(
      sanitizeTranslations(dto.nameTranslations),
      dto.name,
    );
    const descriptionTranslations = withDefaultLocale(
      sanitizeTranslations(dto.descriptionTranslations),
      dto.description,
    );
    const defaultName = this.assertDefaultLocaleName(nameTranslations);

    return this.masterDataGroupsService.create({
      groupKey: dto.groupKey,
      name: defaultName,
      nameTranslations,
      description: descriptionTranslations[DEFAULT_LOCALE] ?? null,
      descriptionTranslations,
      isActive: dto.isActive ?? true,
      displayOrder: dto.displayOrder ?? 0,
    });
  }

  /** Name, description, order and the on/off switch — never the key. */
  async updateGroup(
    groupKey: string,
    dto: UpdateMasterDataAdminGroupDto,
  ): Promise<MasterDataGroup | null> {
    const group = await this.findGroupOrThrow(groupKey);
    const payload: Record<string, unknown> = {
      isActive: dto.isActive,
      displayOrder: dto.displayOrder,
    };

    if (dto.nameTranslations !== undefined || dto.name !== undefined) {
      const nameTranslations = withDefaultLocale(
        mergeTranslations(group.nameTranslations, dto.nameTranslations),
        dto.nameTranslations?.[DEFAULT_LOCALE] === undefined
          ? dto.name
          : undefined,
      );
      payload.name = this.assertDefaultLocaleName(nameTranslations);
      payload.nameTranslations = nameTranslations;
    }

    if (
      dto.descriptionTranslations !== undefined ||
      dto.description !== undefined
    ) {
      const descriptionTranslations = withDefaultLocale(
        mergeTranslations(
          group.descriptionTranslations,
          dto.descriptionTranslations,
        ),
        dto.descriptionTranslations?.[DEFAULT_LOCALE] === undefined
          ? dto.description
          : undefined,
      );
      payload.descriptionTranslations = descriptionTranslations;
      payload.description = descriptionTranslations[DEFAULT_LOCALE] ?? null;
    }

    for (const key of Object.keys(payload)) {
      if (payload[key] === undefined) delete payload[key];
    }

    return this.masterDataGroupsService.update(group.id, payload);
  }

  async findCodesForGroup(
    groupKey: string,
  ): Promise<MasterDataCodeWithCountDto[]> {
    await this.findGroupOrThrow(groupKey);

    const codes = await this.masterDataCodesService.findAllWithPagination({
      filterOptions: { groupKey },
      paginationOptions: { page: 1, limit: GROUP_CODE_LIMIT },
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

    // `name`/`description` are shorthand for the default locale, which keeps
    // every pre-Epic-6 caller working unchanged.
    const nameTranslations = withDefaultLocale(
      sanitizeTranslations(dto.nameTranslations),
      dto.name,
    );
    const descriptionTranslations = withDefaultLocale(
      sanitizeTranslations(dto.descriptionTranslations),
      dto.description,
    );

    const defaultName = this.assertDefaultLocaleName(nameTranslations);

    await this.assertNameUnique(group.id, defaultName);

    return this.masterDataCodesService.create({
      code: dto.code,
      name: defaultName,
      description: descriptionTranslations[DEFAULT_LOCALE],
      nameTranslations,
      descriptionTranslations,
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

    const touchesName =
      dto.nameTranslations !== undefined || dto.name !== undefined;
    const touchesDescription =
      dto.descriptionTranslations !== undefined ||
      dto.description !== undefined;

    const payload: Record<string, unknown> = { ...dto };

    if (touchesName) {
      const nameTranslations = withDefaultLocale(
        mergeTranslations(code.nameTranslations, dto.nameTranslations),
        // Only treat the shorthand as the vi value when no explicit vi patch
        // was sent.
        dto.nameTranslations?.[DEFAULT_LOCALE] === undefined
          ? dto.name
          : undefined,
      );

      const defaultName = this.assertDefaultLocaleName(nameTranslations);

      // `code.name` arrives localized from the mapper, so the comparison has
      // to use the stored default-locale value, not the rendered one.
      if (defaultName !== code.nameTranslations?.[DEFAULT_LOCALE]) {
        await this.assertNameUnique(group.id, defaultName);
      }

      payload.nameTranslations = nameTranslations;
      payload.name = defaultName;
    }

    if (touchesDescription) {
      const descriptionTranslations = withDefaultLocale(
        mergeTranslations(
          code.descriptionTranslations,
          dto.descriptionTranslations,
        ),
        dto.descriptionTranslations?.[DEFAULT_LOCALE] === undefined
          ? dto.description
          : undefined,
      );

      payload.descriptionTranslations = descriptionTranslations;
      payload.description = descriptionTranslations[DEFAULT_LOCALE] ?? null;
    }

    return this.masterDataCodesService.update(id, payload);
  }

  /**
   * Epic 6 §2.2.3 — per-locale translation coverage for the admin editor's
   * "missing translation" indicator.
   */
  async translationCoverage(
    groupKey: string,
    includeInactive = false,
  ): Promise<TranslationCoverageDto> {
    await this.findGroupOrThrow(groupKey);

    const codes = await this.masterDataCodesService.findAllWithPagination({
      filterOptions: { groupKey },
      paginationOptions: { page: 1, limit: GROUP_CODE_LIMIT },
    });

    return this.coverageOf(
      includeInactive ? codes : codes.filter((code) => code.isActive),
    );
  }

  /**
   * Coverage for every group in one read: one query for the groups, one for
   * all codes, grouped here.
   *
   * The admin screen used to call the per-group route once per group to
   * draw the list's chips — 22 requests on every open, and again for each
   * group after every save. Groups with no codes come back with zeros, so
   * every key the screen asks about is present.
   */
  async translationCoverageByGroup(
    includeInactive = false,
  ): Promise<Record<string, TranslationCoverageDto>> {
    const [groups, codes] = await Promise.all([
      this.findAllGroups(),
      this.masterDataCodesService.findAllWithPagination({
        filterOptions: includeInactive ? {} : { isActive: true },
        paginationOptions: { page: 1, limit: ALL_CODES_LIMIT },
      }),
    ]);

    const byGroup = new Map<string, MasterDataCode[]>();
    for (const code of codes) {
      const key = code.group?.groupKey;
      if (!key) continue;
      const list = byGroup.get(key) ?? [];
      list.push(code);
      byGroup.set(key, list);
    }

    return Object.fromEntries(
      groups.map((group) => [
        group.groupKey,
        this.coverageOf(byGroup.get(group.groupKey) ?? []),
      ]),
    );
  }

  /** Per-locale counts over codes already scoped (active or not) by the caller. */
  private coverageOf(scoped: MasterDataCode[]): TranslationCoverageDto {
    const coverage: TranslationCoverageDto = {};

    for (const locale of SUPPORTED_LOCALES) {
      const missing = scoped.filter((code) => {
        const value = code.nameTranslations?.[locale];
        return typeof value !== 'string' || value.trim() === '';
      });

      coverage[locale] = {
        total: scoped.length,
        translated: scoped.length - missing.length,
        missingIds: missing.map((code) => code.id),
      };
    }

    return coverage;
  }

  private assertDefaultLocaleName(translations: TranslationMap): string {
    const value = translations[DEFAULT_LOCALE];

    if (typeof value !== 'string' || value.trim() === '') {
      throw new UnprocessableEntityException({
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        errors: { nameTranslations: 'defaultLocaleRequired' },
      });
    }

    return value;
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
