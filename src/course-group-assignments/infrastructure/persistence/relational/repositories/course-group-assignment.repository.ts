import { Injectable } from '@nestjs/common';
import { omitUndefined } from '../../../../../utils/omit-undefined';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { pickLocalized } from '../../../../../utils/i18n/pick-localized';
import { LocaleContext } from '../../../../../utils/i18n/locale-context';
import { TranslationMap } from '../../../../../utils/i18n/translation-map.type';
import { CourseGroupAssignmentEntity } from '../entities/course-group-assignment.entity';
import { NullableType } from '../../../../../utils/types/nullable.type';
import { CourseGroupAssignment } from '../../../../domain/course-group-assignment';
import { CourseGroupAssignmentRepository } from '../../course-group-assignment.repository';
import { CourseGroupAssignmentMapper } from '../mappers/course-group-assignment.mapper';
import { IPaginationOptions } from '../../../../../utils/types/pagination-options';

@Injectable()
export class CourseGroupAssignmentRelationalRepository implements CourseGroupAssignmentRepository {
  constructor(
    @InjectRepository(CourseGroupAssignmentEntity)
    private readonly courseGroupAssignmentRepository: Repository<CourseGroupAssignmentEntity>,
  ) {}

  async create(data: CourseGroupAssignment): Promise<CourseGroupAssignment> {
    const persistenceModel = CourseGroupAssignmentMapper.toPersistence(data);
    const newEntity = await this.courseGroupAssignmentRepository.save(
      this.courseGroupAssignmentRepository.create(persistenceModel),
    );
    return CourseGroupAssignmentMapper.toDomain(newEntity);
  }

  async findAllWithPagination({
    paginationOptions,
  }: {
    paginationOptions: IPaginationOptions;
  }): Promise<CourseGroupAssignment[]> {
    const entities = await this.courseGroupAssignmentRepository.find({
      skip: (paginationOptions.page - 1) * paginationOptions.limit,
      take: paginationOptions.limit,
    });

    return entities.map((entity) =>
      CourseGroupAssignmentMapper.toDomain(entity),
    );
  }

  async findById(
    id: CourseGroupAssignment['id'],
  ): Promise<NullableType<CourseGroupAssignment>> {
    const entity = await this.courseGroupAssignmentRepository.findOne({
      where: { id },
    });

    return entity ? CourseGroupAssignmentMapper.toDomain(entity) : null;
  }

  async findByIds(
    ids: CourseGroupAssignment['id'][],
  ): Promise<CourseGroupAssignment[]> {
    const entities = await this.courseGroupAssignmentRepository.find({
      where: { id: In(ids) },
    });

    return entities.map((entity) =>
      CourseGroupAssignmentMapper.toDomain(entity),
    );
  }

  async countByGroupId(groupId: string): Promise<number> {
    return this.courseGroupAssignmentRepository.count({
      where: { group: { id: groupId } },
    });
  }

  async findByCourseId(courseId: string): Promise<CourseGroupAssignment[]> {
    const entities = await this.courseGroupAssignmentRepository.find({
      where: { course: { id: courseId } },
    });

    return entities.map((entity) =>
      CourseGroupAssignmentMapper.toDomain(entity),
    );
  }

  async findGroupIdsByCourseIds(
    courseIds: string[],
  ): Promise<Map<string, string[]>> {
    const result = new Map<string, string[]>(
      courseIds.map((courseId) => [courseId, []]),
    );

    if (!courseIds.length) {
      return result;
    }

    // Raw ids only: the entity has both sides eager, so `find()` here would
    // hydrate a full course and a full master-data code per assignment for a
    // field that is a list of uuids.
    const rows = await this.courseGroupAssignmentRepository
      .createQueryBuilder('assignment')
      .select('assignment.courseId', 'courseId')
      .addSelect('assignment.groupId', 'groupId')
      .where('assignment.courseId IN (:...courseIds)', { courseIds })
      .orderBy('assignment.createdAt', 'ASC')
      .getRawMany<{ courseId: string; groupId: string }>();

    for (const row of rows) {
      result.get(row.courseId)?.push(row.groupId);
    }

    return result;
  }

  async findPrimaryGroupByCourseIds(
    courseIds: string[],
  ): Promise<Map<string, { id: string; name: string }>> {
    const byCourse = new Map<string, { id: string; name: string }>();

    if (!courseIds.length) {
      return byCourse;
    }

    // Only the four columns the label needs. `find()` would hydrate a whole
    // course and a whole master-data code per assignment for a name.
    const rows = await this.courseGroupAssignmentRepository
      .createQueryBuilder('assignment')
      .innerJoin('assignment.group', 'grp')
      .select('assignment.courseId', 'courseId')
      .addSelect('grp.id', 'id')
      .addSelect('grp.name', 'name')
      .addSelect('grp.nameTranslations', 'nameTranslations')
      .where('assignment.courseId IN (:...courseIds)', { courseIds })
      .orderBy('grp.displayOrder', 'ASC')
      .addOrderBy('grp.name', 'ASC')
      .getRawMany<{
        courseId: string;
        id: string;
        name: string;
        nameTranslations: TranslationMap | null;
      }>();

    const locale = LocaleContext.current();

    for (const row of rows) {
      // Ordered by the database, so the first row per course is the winner.
      if (byCourse.has(row.courseId)) {
        continue;
      }

      byCourse.set(row.courseId, {
        id: row.id,
        name: pickLocalized(row.nameTranslations, locale, row.name),
      });
    }

    return byCourse;
  }

  async removeByCourseId(courseId: string): Promise<void> {
    await this.courseGroupAssignmentRepository.delete({
      course: { id: courseId },
    });
  }

  async update(
    id: CourseGroupAssignment['id'],
    payload: Partial<CourseGroupAssignment>,
  ): Promise<CourseGroupAssignment> {
    const entity = await this.courseGroupAssignmentRepository.findOne({
      where: { id },
    });

    if (!entity) {
      throw new Error('Record not found');
    }

    const updatedEntity = await this.courseGroupAssignmentRepository.save(
      this.courseGroupAssignmentRepository.create(
        CourseGroupAssignmentMapper.toPersistence({
          ...CourseGroupAssignmentMapper.toDomain(entity),
          ...omitUndefined(payload),
        }),
      ),
    );

    return CourseGroupAssignmentMapper.toDomain(updatedEntity);
  }

  async remove(id: CourseGroupAssignment['id']): Promise<void> {
    await this.courseGroupAssignmentRepository.delete(id);
  }
}
