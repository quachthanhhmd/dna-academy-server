import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { MediaFileEntity } from '../../../../../media-files/infrastructure/persistence/relational/entities/media-file.entity';
import { UserEntity } from '../../../../../users/infrastructure/persistence/relational/entities/user.entity';
import {
  FileRepository,
  MEDIA_FILE_READY,
  NewStoredFile,
} from '../../file.repository';

import { FileMapper } from '../mappers/file.mapper';
import { FileType } from '../../../../domain/file';
import { NullableType } from '../../../../../utils/types/nullable.type';

@Injectable()
export class FileRelationalRepository implements FileRepository {
  constructor(
    @InjectRepository(MediaFileEntity)
    private readonly mediaFileRepository: Repository<MediaFileEntity>,
  ) {}

  async create(data: NewStoredFile): Promise<FileType> {
    const entity = this.mediaFileRepository.create({
      status: MEDIA_FILE_READY,
      objectKey: data.objectKey,
      bucket: data.bucket,
      visibility: data.visibility,
      purpose: data.purpose,
      fileName: data.fileName ?? null,
      mimeType: data.mimeType ?? null,
      sizeBytes: data.sizeBytes ?? null,
      uploadedBy: data.uploadedById
        ? ({ id: data.uploadedById } as UserEntity)
        : null,
    });

    return FileMapper.toDomain(await this.mediaFileRepository.save(entity));
  }

  async findById(id: FileType['id']): Promise<NullableType<FileType>> {
    const entity = await this.mediaFileRepository.findOne({
      where: {
        id: id,
      },
    });

    return entity ? FileMapper.toDomain(entity) : null;
  }

  async findByIds(ids: FileType['id'][]): Promise<FileType[]> {
    const entities = await this.mediaFileRepository.find({
      where: {
        id: In(ids),
      },
    });

    return entities.map((entity) => FileMapper.toDomain(entity));
  }
}
