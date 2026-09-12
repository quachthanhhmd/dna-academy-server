import { Injectable } from '@nestjs/common';
import { omitUndefined } from '../../../../../utils/omit-undefined';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { LectureContentDocumentEntity } from '../entities/lecture-content-document.entity';
import { NullableType } from '../../../../../utils/types/nullable.type';
import { LectureContentDocument } from '../../../../domain/lecture-content-document';
import { LectureContentDocumentRepository } from '../../lecture-content-document.repository';
import { LectureContentDocumentMapper } from '../mappers/lecture-content-document.mapper';
import { IPaginationOptions } from '../../../../../utils/types/pagination-options';

@Injectable()
export class LectureContentDocumentRelationalRepository implements LectureContentDocumentRepository {
  constructor(
    @InjectRepository(LectureContentDocumentEntity)
    private readonly lectureContentDocumentRepository: Repository<LectureContentDocumentEntity>,
  ) {}

  async create(data: LectureContentDocument): Promise<LectureContentDocument> {
    const persistenceModel = LectureContentDocumentMapper.toPersistence(data);
    const newEntity = await this.lectureContentDocumentRepository.save(
      this.lectureContentDocumentRepository.create(persistenceModel),
    );
    return LectureContentDocumentMapper.toDomain(newEntity);
  }

  async findAllWithPagination({
    paginationOptions,
  }: {
    paginationOptions: IPaginationOptions;
  }): Promise<LectureContentDocument[]> {
    const entities = await this.lectureContentDocumentRepository.find({
      skip: (paginationOptions.page - 1) * paginationOptions.limit,
      take: paginationOptions.limit,
    });

    return entities.map((entity) =>
      LectureContentDocumentMapper.toDomain(entity),
    );
  }

  async findById(
    id: LectureContentDocument['id'],
  ): Promise<NullableType<LectureContentDocument>> {
    const entity = await this.lectureContentDocumentRepository.findOne({
      where: { id },
    });

    return entity ? LectureContentDocumentMapper.toDomain(entity) : null;
  }

  async findByIds(
    ids: LectureContentDocument['id'][],
  ): Promise<LectureContentDocument[]> {
    const entities = await this.lectureContentDocumentRepository.find({
      where: { id: In(ids) },
    });

    return entities.map((entity) =>
      LectureContentDocumentMapper.toDomain(entity),
    );
  }

  async findByLectureId(
    lectureId: string,
  ): Promise<NullableType<LectureContentDocument>> {
    const entity = await this.lectureContentDocumentRepository.findOne({
      where: { lecture: { id: lectureId } },
    });

    return entity ? LectureContentDocumentMapper.toDomain(entity) : null;
  }

  async update(
    id: LectureContentDocument['id'],
    payload: Partial<LectureContentDocument>,
  ): Promise<LectureContentDocument> {
    const entity = await this.lectureContentDocumentRepository.findOne({
      where: { id },
    });

    if (!entity) {
      throw new Error('Record not found');
    }

    const updatedEntity = await this.lectureContentDocumentRepository.save(
      this.lectureContentDocumentRepository.create(
        LectureContentDocumentMapper.toPersistence({
          ...LectureContentDocumentMapper.toDomain(entity),
          ...omitUndefined(payload),
        }),
      ),
    );

    return LectureContentDocumentMapper.toDomain(updatedEntity);
  }

  async remove(id: LectureContentDocument['id']): Promise<void> {
    await this.lectureContentDocumentRepository.delete(id);
  }
}
