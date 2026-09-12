import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { InstructorSocialLinkEntity } from '../entities/instructor-social-link.entity';
import { InstructorSocialLink } from '../../../../domain/instructor-social-link';
import { InstructorSocialLinkRepository } from '../../instructor-social-link.repository';
import { InstructorSocialLinkMapper } from '../mappers/instructor-social-link.mapper';

@Injectable()
export class InstructorSocialLinkRelationalRepository implements InstructorSocialLinkRepository {
  constructor(
    @InjectRepository(InstructorSocialLinkEntity)
    private readonly instructorSocialLinkRepository: Repository<InstructorSocialLinkEntity>,
  ) {}

  async create(data: InstructorSocialLink): Promise<InstructorSocialLink> {
    const persistenceModel = InstructorSocialLinkMapper.toPersistence(data);
    const newEntity = await this.instructorSocialLinkRepository.save(
      this.instructorSocialLinkRepository.create(persistenceModel),
    );
    return InstructorSocialLinkMapper.toDomain(newEntity);
  }

  async findByInstructorId(
    instructorId: string,
  ): Promise<InstructorSocialLink[]> {
    const entities = await this.instructorSocialLinkRepository.find({
      where: { instructor: { id: instructorId } },
      order: { displayOrder: 'ASC' },
    });

    return entities.map((entity) =>
      InstructorSocialLinkMapper.toDomain(entity),
    );
  }

  async findByInstructorIds(
    instructorIds: string[],
  ): Promise<InstructorSocialLink[]> {
    if (!instructorIds.length) {
      return [];
    }

    const entities = await this.instructorSocialLinkRepository.find({
      where: { instructor: { id: In(instructorIds) } },
      relations: { instructor: true },
      order: { displayOrder: 'ASC' },
    });

    return entities.map((entity) =>
      InstructorSocialLinkMapper.toDomain(entity),
    );
  }

  async removeByInstructorId(instructorId: string): Promise<void> {
    await this.instructorSocialLinkRepository.delete({
      instructor: { id: instructorId },
    });
  }
}
