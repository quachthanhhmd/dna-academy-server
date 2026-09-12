import { Injectable } from '@nestjs/common';
import { omitUndefined } from '../../../../../utils/omit-undefined';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, IsNull, Not } from 'typeorm';
import { QuizAttemptEntity } from '../entities/quiz-attempt.entity';
import { NullableType } from '../../../../../utils/types/nullable.type';
import { QuizAttempt } from '../../../../domain/quiz-attempt';
import { QuizAttemptRepository } from '../../quiz-attempt.repository';
import { QuizAttemptMapper } from '../mappers/quiz-attempt.mapper';
import { IPaginationOptions } from '../../../../../utils/types/pagination-options';

@Injectable()
export class QuizAttemptRelationalRepository implements QuizAttemptRepository {
  constructor(
    @InjectRepository(QuizAttemptEntity)
    private readonly quizAttemptRepository: Repository<QuizAttemptEntity>,
  ) {}

  async create(data: QuizAttempt): Promise<QuizAttempt> {
    const persistenceModel = QuizAttemptMapper.toPersistence(data);
    const newEntity = await this.quizAttemptRepository.save(
      this.quizAttemptRepository.create(persistenceModel),
    );
    return QuizAttemptMapper.toDomain(newEntity);
  }

  async findAllWithPagination({
    paginationOptions,
  }: {
    paginationOptions: IPaginationOptions;
  }): Promise<QuizAttempt[]> {
    const entities = await this.quizAttemptRepository.find({
      skip: (paginationOptions.page - 1) * paginationOptions.limit,
      take: paginationOptions.limit,
    });

    return entities.map((entity) => QuizAttemptMapper.toDomain(entity));
  }

  async findById(id: QuizAttempt['id']): Promise<NullableType<QuizAttempt>> {
    const entity = await this.quizAttemptRepository.findOne({
      where: { id },
    });

    return entity ? QuizAttemptMapper.toDomain(entity) : null;
  }

  async findByIds(ids: QuizAttempt['id'][]): Promise<QuizAttempt[]> {
    const entities = await this.quizAttemptRepository.find({
      where: { id: In(ids) },
    });

    return entities.map((entity) => QuizAttemptMapper.toDomain(entity));
  }

  async findByEnrollmentAndLecture(
    enrollmentId: string,
    lectureId: string,
  ): Promise<QuizAttempt[]> {
    const entities = await this.quizAttemptRepository.find({
      where: {
        enrollment: { id: enrollmentId },
        lecture: { id: lectureId },
      },
      order: { createdAt: 'DESC' },
    });

    return entities.map((entity) => QuizAttemptMapper.toDomain(entity));
  }

  async findSubmittedByEnrollmentIds(
    enrollmentIds: string[],
  ): Promise<QuizAttempt[]> {
    if (!enrollmentIds.length) {
      return [];
    }

    const entities = await this.quizAttemptRepository.find({
      where: {
        enrollment: { id: In(enrollmentIds) },
        submittedAt: Not(IsNull()),
      },
    });

    return entities.map((entity) => QuizAttemptMapper.toDomain(entity));
  }

  async update(
    id: QuizAttempt['id'],
    payload: Partial<QuizAttempt>,
  ): Promise<QuizAttempt> {
    const entity = await this.quizAttemptRepository.findOne({
      where: { id },
    });

    if (!entity) {
      throw new Error('Record not found');
    }

    const updatedEntity = await this.quizAttemptRepository.save(
      this.quizAttemptRepository.create(
        QuizAttemptMapper.toPersistence({
          ...QuizAttemptMapper.toDomain(entity),
          ...omitUndefined(payload),
        }),
      ),
    );

    return QuizAttemptMapper.toDomain(updatedEntity);
  }

  async remove(id: QuizAttempt['id']): Promise<void> {
    await this.quizAttemptRepository.delete(id);
  }

  async removeByEnrollmentId(enrollmentId: string): Promise<void> {
    await this.quizAttemptRepository.delete({
      enrollment: { id: enrollmentId },
    });
  }
}
