import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { SectionEntity } from '../entities/section.entity';
import { NullableType } from '../../../../../utils/types/nullable.type';
import { Section } from '../../../../domain/section';
import { SectionRepository } from '../../section.repository';
import { SectionMapper } from '../mappers/section.mapper';
import { IPaginationOptions } from '../../../../../utils/types/pagination-options';

@Injectable()
export class SectionRelationalRepository implements SectionRepository {
  constructor(
    @InjectRepository(SectionEntity)
    private readonly sectionRepository: Repository<SectionEntity>,
  ) {}

  async create(data: Section): Promise<Section> {
    const persistenceModel = SectionMapper.toPersistence(data);
    const newEntity = await this.sectionRepository.save(
      this.sectionRepository.create(persistenceModel),
    );
    return SectionMapper.toDomain(newEntity);
  }

  async findAllWithPagination({
    paginationOptions,
  }: {
    paginationOptions: IPaginationOptions;
  }): Promise<Section[]> {
    const entities = await this.sectionRepository.find({
      skip: (paginationOptions.page - 1) * paginationOptions.limit,
      take: paginationOptions.limit,
    });

    return entities.map((entity) => SectionMapper.toDomain(entity));
  }

  async findById(id: Section['id']): Promise<NullableType<Section>> {
    const entity = await this.sectionRepository.findOne({
      where: { id },
    });

    return entity ? SectionMapper.toDomain(entity) : null;
  }

  async findByIds(ids: Section['id'][]): Promise<Section[]> {
    const entities = await this.sectionRepository.find({
      where: { id: In(ids) },
    });

    return entities.map((entity) => SectionMapper.toDomain(entity));
  }

  async update(id: Section['id'], payload: Partial<Section>): Promise<Section> {
    const entity = await this.sectionRepository.findOne({
      where: { id },
    });

    if (!entity) {
      throw new Error('Record not found');
    }

    const updatedEntity = await this.sectionRepository.save(
      this.sectionRepository.create(
        SectionMapper.toPersistence({
          ...SectionMapper.toDomain(entity),
          ...payload,
        }),
      ),
    );

    return SectionMapper.toDomain(updatedEntity);
  }

  async remove(id: Section['id']): Promise<void> {
    await this.sectionRepository.delete(id);
  }
}
