import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { MediaFileEntity } from '../entities/media-file.entity';
import { NullableType } from '../../../../../utils/types/nullable.type';
import { MediaFile } from '../../../../domain/media-file';
import { MediaFileRepository } from '../../media-file.repository';
import { MediaFileMapper } from '../mappers/media-file.mapper';
import { IPaginationOptions } from '../../../../../utils/types/pagination-options';

@Injectable()
export class MediaFileRelationalRepository implements MediaFileRepository {
  constructor(
    @InjectRepository(MediaFileEntity)
    private readonly mediaFileRepository: Repository<MediaFileEntity>,
  ) {}

  async create(data: MediaFile): Promise<MediaFile> {
    const persistenceModel = MediaFileMapper.toPersistence(data);
    const newEntity = await this.mediaFileRepository.save(
      this.mediaFileRepository.create(persistenceModel),
    );
    return MediaFileMapper.toDomain(newEntity);
  }

  async findAllWithPagination({
    paginationOptions,
  }: {
    paginationOptions: IPaginationOptions;
  }): Promise<MediaFile[]> {
    const entities = await this.mediaFileRepository.find({
      skip: (paginationOptions.page - 1) * paginationOptions.limit,
      take: paginationOptions.limit,
    });

    return entities.map((entity) => MediaFileMapper.toDomain(entity));
  }

  async findById(id: MediaFile['id']): Promise<NullableType<MediaFile>> {
    const entity = await this.mediaFileRepository.findOne({
      where: { id },
    });

    return entity ? MediaFileMapper.toDomain(entity) : null;
  }

  async findByIds(ids: MediaFile['id'][]): Promise<MediaFile[]> {
    const entities = await this.mediaFileRepository.find({
      where: { id: In(ids) },
    });

    return entities.map((entity) => MediaFileMapper.toDomain(entity));
  }

  async update(
    id: MediaFile['id'],
    payload: Partial<MediaFile>,
  ): Promise<MediaFile> {
    const entity = await this.mediaFileRepository.findOne({
      where: { id },
    });

    if (!entity) {
      throw new Error('Record not found');
    }

    const updatedEntity = await this.mediaFileRepository.save(
      this.mediaFileRepository.create(
        MediaFileMapper.toPersistence({
          ...MediaFileMapper.toDomain(entity),
          ...payload,
        }),
      ),
    );

    return MediaFileMapper.toDomain(updatedEntity);
  }

  async remove(id: MediaFile['id']): Promise<void> {
    await this.mediaFileRepository.delete(id);
  }
}
