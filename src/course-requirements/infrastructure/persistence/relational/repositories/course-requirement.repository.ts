import { Injectable } from '@nestjs/common';
import { omitUndefined } from '../../../../../utils/omit-undefined';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { CourseRequirementEntity } from '../entities/course-requirement.entity';
import { NullableType } from '../../../../../utils/types/nullable.type';
import { CourseRequirement } from '../../../../domain/course-requirement';
import { CourseRequirementRepository } from '../../course-requirement.repository';
import { CourseRequirementMapper } from '../mappers/course-requirement.mapper';
import { IPaginationOptions } from '../../../../../utils/types/pagination-options';

@Injectable()
export class CourseRequirementRelationalRepository implements CourseRequirementRepository {
  constructor(
    @InjectRepository(CourseRequirementEntity)
    private readonly courseRequirementRepository: Repository<CourseRequirementEntity>,
  ) {}

  async create(data: CourseRequirement): Promise<CourseRequirement> {
    const persistenceModel = CourseRequirementMapper.toPersistence(data);
    const newEntity = await this.courseRequirementRepository.save(
      this.courseRequirementRepository.create(persistenceModel),
    );
    return CourseRequirementMapper.toDomain(newEntity);
  }

  async findAllWithPagination({
    paginationOptions,
  }: {
    paginationOptions: IPaginationOptions;
  }): Promise<CourseRequirement[]> {
    const entities = await this.courseRequirementRepository.find({
      skip: (paginationOptions.page - 1) * paginationOptions.limit,
      take: paginationOptions.limit,
    });

    return entities.map((entity) => CourseRequirementMapper.toDomain(entity));
  }

  async findById(
    id: CourseRequirement['id'],
  ): Promise<NullableType<CourseRequirement>> {
    const entity = await this.courseRequirementRepository.findOne({
      where: { id },
    });

    return entity ? CourseRequirementMapper.toDomain(entity) : null;
  }

  async findByIds(
    ids: CourseRequirement['id'][],
  ): Promise<CourseRequirement[]> {
    const entities = await this.courseRequirementRepository.find({
      where: { id: In(ids) },
    });

    return entities.map((entity) => CourseRequirementMapper.toDomain(entity));
  }

  async findByCourseId(courseId: string): Promise<CourseRequirement[]> {
    const entities = await this.courseRequirementRepository.find({
      where: { course: { id: courseId } },
      order: { displayOrder: 'ASC' },
    });

    return entities.map((entity) => CourseRequirementMapper.toDomain(entity));
  }

  async removeByCourseId(courseId: string): Promise<void> {
    await this.courseRequirementRepository.delete({ course: { id: courseId } });
  }

  async update(
    id: CourseRequirement['id'],
    payload: Partial<CourseRequirement>,
  ): Promise<CourseRequirement> {
    const entity = await this.courseRequirementRepository.findOne({
      where: { id },
    });

    if (!entity) {
      throw new Error('Record not found');
    }

    const updatedEntity = await this.courseRequirementRepository.save(
      this.courseRequirementRepository.create(
        CourseRequirementMapper.toPersistence({
          ...CourseRequirementMapper.toDomain(entity),
          ...omitUndefined(payload),
        }),
      ),
    );

    return CourseRequirementMapper.toDomain(updatedEntity);
  }

  async remove(id: CourseRequirement['id']): Promise<void> {
    await this.courseRequirementRepository.delete(id);
  }
}
