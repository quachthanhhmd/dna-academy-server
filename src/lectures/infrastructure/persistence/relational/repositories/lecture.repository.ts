import { Injectable } from '@nestjs/common';
import { omitUndefined } from '../../../../../utils/omit-undefined';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { LectureEntity } from '../entities/lecture.entity';
import { NullableType } from '../../../../../utils/types/nullable.type';
import { Lecture } from '../../../../domain/lecture';
import { LectureRepository } from '../../lecture.repository';
import { LectureMapper } from '../mappers/lecture.mapper';
import { IPaginationOptions } from '../../../../../utils/types/pagination-options';

@Injectable()
export class LectureRelationalRepository implements LectureRepository {
  constructor(
    @InjectRepository(LectureEntity)
    private readonly lectureRepository: Repository<LectureEntity>,
  ) {}

  async create(data: Lecture): Promise<Lecture> {
    const persistenceModel = LectureMapper.toPersistence(data);
    const newEntity = await this.lectureRepository.save(
      this.lectureRepository.create(persistenceModel),
    );
    return LectureMapper.toDomain(newEntity);
  }

  async findAllWithPagination({
    paginationOptions,
  }: {
    paginationOptions: IPaginationOptions;
  }): Promise<Lecture[]> {
    const entities = await this.lectureRepository.find({
      skip: (paginationOptions.page - 1) * paginationOptions.limit,
      take: paginationOptions.limit,
    });

    return entities.map((entity) => LectureMapper.toDomain(entity));
  }

  async findById(id: Lecture['id']): Promise<NullableType<Lecture>> {
    const entity = await this.lectureRepository.findOne({
      where: { id },
    });

    return entity ? LectureMapper.toDomain(entity) : null;
  }

  async findByIds(ids: Lecture['id'][]): Promise<Lecture[]> {
    const entities = await this.lectureRepository.find({
      where: { id: In(ids) },
    });

    return entities.map((entity) => LectureMapper.toDomain(entity));
  }

  async findBySectionId(sectionId: string): Promise<Lecture[]> {
    const entities = await this.lectureRepository.find({
      where: { section: { id: sectionId } },
      order: { displayOrder: 'ASC' },
    });

    return entities.map((entity) => LectureMapper.toDomain(entity));
  }

  async findOrderedByCourseIds(
    courseIds: string[],
  ): Promise<Map<string, (Lecture & { sectionTitle: string })[]>> {
    const byCourse = new Map<string, (Lecture & { sectionTitle: string })[]>(
      courseIds.map((courseId) => [courseId, []]),
    );

    if (!courseIds.length) {
      return byCourse;
    }

    // Ordering is done by the database, in the same key order the curriculum
    // service uses, so the caller can trust the array as course reading order
    // without re-sorting.
    // `section.course` is eager on the entity, but eager relations are not
    // applied by the query builder — so the course has to be joined and
    // selected explicitly or every row comes back without one.
    const entities = await this.lectureRepository
      .createQueryBuilder('lecture')
      .innerJoinAndSelect('lecture.section', 'section')
      .innerJoinAndSelect('section.course', 'course')
      .where('course.id IN (:...courseIds)', { courseIds })
      .orderBy('section.displayOrder', 'ASC')
      .addOrderBy('lecture.displayOrder', 'ASC')
      .getMany();

    for (const entity of entities) {
      const courseId = entity.section?.course?.id;

      if (!courseId) {
        continue;
      }

      const bucket = byCourse.get(courseId);

      if (!bucket) {
        continue;
      }

      bucket.push({
        ...LectureMapper.toDomain(entity),
        sectionTitle: entity.section.title,
      });
    }

    return byCourse;
  }

  async countBySectionId(sectionId: string): Promise<number> {
    return this.lectureRepository.count({
      where: { section: { id: sectionId } },
    });
  }

  async getCourseAggregates(
    courseId: string,
  ): Promise<{ totalLectures: number; totalDurationSecs: number }> {
    const raw = await this.lectureRepository
      .createQueryBuilder('lecture')
      .innerJoin('lecture.section', 'section')
      .where('section.course = :courseId', { courseId })
      .select('COUNT(lecture.id)', 'totalLectures')
      .addSelect('COALESCE(SUM(lecture.durationSecs), 0)', 'totalDurationSecs')
      .getRawOne<{ totalLectures: string; totalDurationSecs: string }>();

    return {
      totalLectures: Number(raw?.totalLectures ?? 0),
      totalDurationSecs: Number(raw?.totalDurationSecs ?? 0),
    };
  }

  async findPreviewCourseIds(courseIds: string[]): Promise<Set<string>> {
    if (!courseIds.length) {
      return new Set();
    }

    const rows = await this.lectureRepository
      .createQueryBuilder('lecture')
      .innerJoin('lecture.section', 'section')
      .select('DISTINCT section.course', 'courseId')
      .where('section.course IN (:...courseIds)', { courseIds })
      .andWhere('lecture.isPreview = true')
      .getRawMany<{ courseId: string }>();

    return new Set(rows.map((row) => row.courseId));
  }

  async removeBySectionId(sectionId: string): Promise<void> {
    await this.lectureRepository.delete({ section: { id: sectionId } });
  }

  async update(id: Lecture['id'], payload: Partial<Lecture>): Promise<Lecture> {
    const entity = await this.lectureRepository.findOne({
      where: { id },
    });

    if (!entity) {
      throw new Error('Record not found');
    }

    const updatedEntity = await this.lectureRepository.save(
      this.lectureRepository.create(
        LectureMapper.toPersistence({
          ...LectureMapper.toDomain(entity),
          ...omitUndefined(payload),
        }),
      ),
    );

    return LectureMapper.toDomain(updatedEntity);
  }

  async remove(id: Lecture['id']): Promise<void> {
    await this.lectureRepository.delete(id);
  }
}
