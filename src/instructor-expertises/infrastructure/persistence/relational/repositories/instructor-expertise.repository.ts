import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { InstructorExpertiseEntity } from '../entities/instructor-expertise.entity';
import { InstructorExpertise } from '../../../../domain/instructor-expertise';
import { InstructorExpertiseRepository } from '../../instructor-expertise.repository';
import { InstructorExpertiseMapper } from '../mappers/instructor-expertise.mapper';

@Injectable()
export class InstructorExpertiseRelationalRepository implements InstructorExpertiseRepository {
  constructor(
    @InjectRepository(InstructorExpertiseEntity)
    private readonly instructorExpertiseRepository: Repository<InstructorExpertiseEntity>,
  ) {}

  async create(data: InstructorExpertise): Promise<InstructorExpertise> {
    const persistenceModel = InstructorExpertiseMapper.toPersistence(data);
    const newEntity = await this.instructorExpertiseRepository.save(
      this.instructorExpertiseRepository.create(persistenceModel),
    );
    return InstructorExpertiseMapper.toDomain(newEntity);
  }

  async findByInstructorId(
    instructorId: string,
  ): Promise<InstructorExpertise[]> {
    const entities = await this.instructorExpertiseRepository.find({
      where: { instructor: { id: instructorId } },
    });

    return entities.map((entity) => InstructorExpertiseMapper.toDomain(entity));
  }

  async findByInstructorIds(
    instructorIds: string[],
  ): Promise<InstructorExpertise[]> {
    if (!instructorIds.length) {
      return [];
    }

    const entities = await this.instructorExpertiseRepository.find({
      where: { instructor: { id: In(instructorIds) } },
      relations: { instructor: true },
    });

    return entities.map((entity) => InstructorExpertiseMapper.toDomain(entity));
  }

  async removeByInstructorId(instructorId: string): Promise<void> {
    await this.instructorExpertiseRepository.delete({
      instructor: { id: instructorId },
    });
  }
}
