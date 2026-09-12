import { Injectable } from '@nestjs/common';
import { omitUndefined } from '../../../../../utils/omit-undefined';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { EnrollmentEntity } from '../entities/enrollment.entity';
import { NullableType } from '../../../../../utils/types/nullable.type';
import { Enrollment } from '../../../../domain/enrollment';
import { EnrollmentRepository } from '../../enrollment.repository';
import { EnrollmentMapper } from '../mappers/enrollment.mapper';
import { IPaginationOptions } from '../../../../../utils/types/pagination-options';

@Injectable()
export class EnrollmentRelationalRepository implements EnrollmentRepository {
  constructor(
    @InjectRepository(EnrollmentEntity)
    private readonly enrollmentRepository: Repository<EnrollmentEntity>,
  ) {}

  async create(data: Enrollment): Promise<Enrollment> {
    const persistenceModel = EnrollmentMapper.toPersistence(data);
    const newEntity = await this.enrollmentRepository.save(
      this.enrollmentRepository.create(persistenceModel),
    );
    return EnrollmentMapper.toDomain(newEntity);
  }

  async findAllWithPagination({
    paginationOptions,
  }: {
    paginationOptions: IPaginationOptions;
  }): Promise<Enrollment[]> {
    const entities = await this.enrollmentRepository.find({
      skip: (paginationOptions.page - 1) * paginationOptions.limit,
      take: paginationOptions.limit,
    });

    return entities.map((entity) => EnrollmentMapper.toDomain(entity));
  }

  async findById(id: Enrollment['id']): Promise<NullableType<Enrollment>> {
    const entity = await this.enrollmentRepository.findOne({
      where: { id },
      // Epic 4.1 D6 — `lastLecture` is eager: false, and the completion screen
      // links "Continue learning" at it. Joined here rather than made eager so
      // only this read pays for it.
      relations: ['lastLecture'],
    });

    return entity ? EnrollmentMapper.toDomain(entity) : null;
  }

  async findByIds(ids: Enrollment['id'][]): Promise<Enrollment[]> {
    const entities = await this.enrollmentRepository.find({
      where: { id: In(ids) },
    });

    return entities.map((entity) => EnrollmentMapper.toDomain(entity));
  }

  async findByStudentAndCourse(
    studentId: number,
    courseId: string,
  ): Promise<NullableType<Enrollment>> {
    const entity = await this.enrollmentRepository.findOne({
      where: { student: { id: studentId }, course: { id: courseId } },
      relations: { lastLecture: true },
    });

    return entity ? EnrollmentMapper.toDomain(entity) : null;
  }

  async findByStudentId(studentId: number): Promise<Enrollment[]> {
    const entities = await this.enrollmentRepository.find({
      where: { student: { id: studentId } },
      // lastLecture is lazy on the entity but the My Courses card needs its
      // title, so pull it in here rather than issuing a query per enrollment.
      relations: { lastLecture: true },
      order: { enrollmentDate: 'DESC' },
    });

    return entities.map((entity) => EnrollmentMapper.toDomain(entity));
  }

  async findEnrolledCourseIds(
    studentId: number,
    courseIds: string[],
  ): Promise<Set<string>> {
    if (!courseIds.length) {
      return new Set();
    }

    const rows = await this.enrollmentRepository
      .createQueryBuilder('enrollment')
      .select('DISTINCT enrollment.courseId', 'courseId')
      .where('enrollment.studentId = :studentId', { studentId })
      .andWhere('enrollment.courseId IN (:...courseIds)', { courseIds })
      .andWhere("enrollment.status <> 'cancelled'")
      .getRawMany<{ courseId: string }>();

    return new Set(rows.map((row) => row.courseId));
  }

  async countDistinctStudentsByCourseIds(courseIds: string[]): Promise<number> {
    if (!courseIds.length) {
      return 0;
    }

    const raw = await this.enrollmentRepository
      .createQueryBuilder('enrollment')
      .select('COUNT(DISTINCT enrollment.studentId)', 'count')
      .where('enrollment.courseId IN (:...courseIds)', { courseIds })
      .getRawOne<{ count: string }>();

    return Number(raw?.count ?? 0);
  }

  async update(
    id: Enrollment['id'],
    payload: Partial<Enrollment>,
  ): Promise<Enrollment> {
    const entity = await this.enrollmentRepository.findOne({
      where: { id },
    });

    if (!entity) {
      throw new Error('Record not found');
    }

    const updatedEntity = await this.enrollmentRepository.save(
      this.enrollmentRepository.create(
        EnrollmentMapper.toPersistence({
          ...EnrollmentMapper.toDomain(entity),
          ...omitUndefined(payload),
        }),
      ),
    );

    return EnrollmentMapper.toDomain(updatedEntity);
  }

  async remove(id: Enrollment['id']): Promise<void> {
    await this.enrollmentRepository.delete(id);
  }
}
