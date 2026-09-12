import { Injectable } from '@nestjs/common';
import { omitUndefined } from '../../../../../utils/omit-undefined';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { CourseInstructorEntity } from '../entities/course-instructor.entity';
import { NullableType } from '../../../../../utils/types/nullable.type';
import { CourseInstructor } from '../../../../domain/course-instructor';
import { CourseInstructorRepository } from '../../course-instructor.repository';
import { CourseInstructorMapper } from '../mappers/course-instructor.mapper';

@Injectable()
export class CourseInstructorRelationalRepository implements CourseInstructorRepository {
  constructor(
    @InjectRepository(CourseInstructorEntity)
    private readonly courseInstructorRepository: Repository<CourseInstructorEntity>,
  ) {}

  async create(data: CourseInstructor): Promise<CourseInstructor> {
    const persistenceModel = CourseInstructorMapper.toPersistence(data);
    const newEntity = await this.courseInstructorRepository.save(
      this.courseInstructorRepository.create(persistenceModel),
    );
    return CourseInstructorMapper.toDomain(newEntity);
  }

  async findById(
    id: CourseInstructor['id'],
  ): Promise<NullableType<CourseInstructor>> {
    const entity = await this.courseInstructorRepository.findOne({
      where: { id },
    });

    return entity ? CourseInstructorMapper.toDomain(entity) : null;
  }

  async findByCourseId(courseId: string): Promise<CourseInstructor[]> {
    const entities = await this.courseInstructorRepository.find({
      where: { course: { id: courseId } },
      order: { role: 'ASC', displayOrder: 'ASC' },
    });

    return entities.map((entity) => CourseInstructorMapper.toDomain(entity));
  }

  async findByCourseIds(courseIds: string[]): Promise<CourseInstructor[]> {
    if (!courseIds.length) {
      return [];
    }

    const entities = await this.courseInstructorRepository.find({
      where: { course: { id: In(courseIds) } },
      order: { role: 'ASC', displayOrder: 'ASC' },
    });

    return entities.map((entity) => CourseInstructorMapper.toDomain(entity));
  }

  async findByInstructorId(instructorId: string): Promise<CourseInstructor[]> {
    const entities = await this.courseInstructorRepository.find({
      where: { instructor: { id: instructorId } },
      order: { createdAt: 'DESC' },
    });

    return entities.map((entity) => CourseInstructorMapper.toDomain(entity));
  }

  countByInstructorId(instructorId: string): Promise<number> {
    return this.courseInstructorRepository.count({
      where: { instructor: { id: instructorId } },
    });
  }

  async update(
    id: CourseInstructor['id'],
    payload: Partial<CourseInstructor>,
  ): Promise<CourseInstructor> {
    const entity = await this.courseInstructorRepository.findOne({
      where: { id },
    });

    if (!entity) {
      throw new Error('Record not found');
    }

    const updatedEntity = await this.courseInstructorRepository.save(
      this.courseInstructorRepository.create(
        CourseInstructorMapper.toPersistence({
          ...CourseInstructorMapper.toDomain(entity),
          ...omitUndefined(payload),
        }),
      ),
    );

    return CourseInstructorMapper.toDomain(updatedEntity);
  }

  async remove(id: CourseInstructor['id']): Promise<void> {
    await this.courseInstructorRepository.delete(id);
  }

  async removeByCourseId(courseId: string): Promise<void> {
    await this.courseInstructorRepository.delete({
      course: { id: courseId },
    });
  }
}
