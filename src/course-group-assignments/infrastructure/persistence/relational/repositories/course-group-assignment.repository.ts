import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
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
          ...payload,
        }),
      ),
    );

    return CourseGroupAssignmentMapper.toDomain(updatedEntity);
  }

  async remove(id: CourseGroupAssignment['id']): Promise<void> {
    await this.courseGroupAssignmentRepository.delete(id);
  }
}
