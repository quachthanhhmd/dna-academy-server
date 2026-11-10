import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { LectureRatingResponseEntity } from '../entities/lecture-rating-response.entity';
import { NullableType } from '../../../../../utils/types/nullable.type';
import { LectureRatingResponse } from '../../../../domain/lecture-rating-response';
import {
  LectureRatingResponseRepository,
  LectureRatingSummary,
  LectureRatingUpsert,
} from '../../lecture-rating-response.repository';
import { LectureRatingResponseMapper } from '../mappers/lecture-rating-response.mapper';
import { IPaginationOptions } from '../../../../../utils/types/pagination-options';

@Injectable()
export class LectureRatingResponseRelationalRepository implements LectureRatingResponseRepository {
  constructor(
    @InjectRepository(LectureRatingResponseEntity)
    private readonly lectureRatingResponseRepository: Repository<LectureRatingResponseEntity>,
  ) {}

  async create(data: LectureRatingResponse): Promise<LectureRatingResponse> {
    const persistenceModel = LectureRatingResponseMapper.toPersistence(data);
    const newEntity = await this.lectureRatingResponseRepository.save(
      this.lectureRatingResponseRepository.create(persistenceModel),
    );
    return LectureRatingResponseMapper.toDomain(newEntity);
  }

  async findAllWithPagination({
    paginationOptions,
  }: {
    paginationOptions: IPaginationOptions;
  }): Promise<LectureRatingResponse[]> {
    const entities = await this.lectureRatingResponseRepository.find({
      skip: (paginationOptions.page - 1) * paginationOptions.limit,
      take: paginationOptions.limit,
    });

    return entities.map((entity) =>
      LectureRatingResponseMapper.toDomain(entity),
    );
  }

  async findById(
    id: LectureRatingResponse['id'],
  ): Promise<NullableType<LectureRatingResponse>> {
    const entity = await this.lectureRatingResponseRepository.findOne({
      where: { id },
    });

    return entity ? LectureRatingResponseMapper.toDomain(entity) : null;
  }

  async findByIds(
    ids: LectureRatingResponse['id'][],
  ): Promise<LectureRatingResponse[]> {
    const entities = await this.lectureRatingResponseRepository.find({
      where: { id: In(ids) },
    });

    return entities.map((entity) =>
      LectureRatingResponseMapper.toDomain(entity),
    );
  }

  async update(
    id: LectureRatingResponse['id'],
    payload: Partial<LectureRatingResponse>,
  ): Promise<LectureRatingResponse> {
    const entity = await this.lectureRatingResponseRepository.findOne({
      where: { id },
    });

    if (!entity) {
      throw new Error('Record not found');
    }

    const updatedEntity = await this.lectureRatingResponseRepository.save(
      this.lectureRatingResponseRepository.create(
        LectureRatingResponseMapper.toPersistence({
          ...LectureRatingResponseMapper.toDomain(entity),
          ...payload,
        }),
      ),
    );

    return LectureRatingResponseMapper.toDomain(updatedEntity);
  }

  async remove(id: LectureRatingResponse['id']): Promise<void> {
    await this.lectureRatingResponseRepository.delete(id);
  }

  async findOne(
    lectureId: string,
    enrollmentId: string,
  ): Promise<NullableType<LectureRatingResponse>> {
    const entity = await this.lectureRatingResponseRepository.findOne({
      where: { lecture: { id: lectureId }, enrollment: { id: enrollmentId } },
    });

    return entity ? LectureRatingResponseMapper.toDomain(entity) : null;
  }

  async upsert(data: LectureRatingUpsert): Promise<LectureRatingResponse> {
    // Read-then-write rather than ON CONFLICT: the unique constraint on
    // (lecture_id, enrollment_id) still refuses a duplicate if two submits
    // race, and this keeps the relation columns out of TypeORM's upsert.
    const existing = await this.lectureRatingResponseRepository.findOne({
      where: {
        lecture: { id: data.lectureId },
        enrollment: { id: data.enrollmentId },
      },
    });

    const saved = await this.lectureRatingResponseRepository.save(
      this.lectureRatingResponseRepository.create({
        ...(existing ? { id: existing.id } : {}),
        lecture: { id: data.lectureId },
        enrollment: { id: data.enrollmentId },
        rating: data.rating,
        comment: data.comment,
        submittedAt: data.submittedAt,
      }),
    );

    return LectureRatingResponseMapper.toDomain(saved);
  }

  async summarize(
    lectureId: string,
    commentLimit: number,
  ): Promise<LectureRatingSummary> {
    const rows = await this.lectureRatingResponseRepository
      .createQueryBuilder('response')
      .select('response.rating', 'rating')
      .addSelect('COUNT(*)', 'count')
      .where('response.lecture_id = :lectureId', { lectureId })
      .groupBy('response.rating')
      .getRawMany<{ rating: number | string; count: string }>();

    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let count = 0;
    let total = 0;
    for (const row of rows) {
      const value = Number(row.rating) as 1 | 2 | 3 | 4 | 5;
      const n = Number(row.count);
      if (value in distribution) distribution[value] = n;
      count += n;
      total += value * n;
    }

    // Raw rows, not `find`: a partial select with `take` and a relation
    // filter makes TypeORM wrap the query in a DISTINCT on a column it did
    // not select, which Postgres refuses.
    const commented = await this.lectureRatingResponseRepository
      .createQueryBuilder('response')
      .select('response.rating', 'rating')
      .addSelect('response.comment', 'comment')
      .addSelect('response.submitted_at', 'submittedAt')
      .where('response.lecture_id = :lectureId', { lectureId })
      .andWhere("NULLIF(TRIM(response.comment), '') IS NOT NULL")
      .orderBy('response.submitted_at', 'DESC')
      .limit(commentLimit)
      .getRawMany<{
        rating: number | string;
        comment: string;
        submittedAt: Date;
      }>();

    return {
      count,
      average: count ? Math.round((total / count) * 10) / 10 : null,
      distribution,
      recentComments: commented.map((row) => ({
        rating: Number(row.rating),
        comment: row.comment,
        submittedAt: row.submittedAt,
      })),
    };
  }

  async removeByEnrollmentId(enrollmentId: string): Promise<void> {
    await this.lectureRatingResponseRepository.delete({
      enrollment: { id: enrollmentId },
    });
  }
}
