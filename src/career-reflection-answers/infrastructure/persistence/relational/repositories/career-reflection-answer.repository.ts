import { Injectable } from '@nestjs/common';
import { omitUndefined } from '../../../../../utils/omit-undefined';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { CareerReflectionAnswerEntity } from '../entities/career-reflection-answer.entity';
import { NullableType } from '../../../../../utils/types/nullable.type';
import { CareerReflectionAnswer } from '../../../../domain/career-reflection-answer';
import { CareerReflectionAnswerRepository } from '../../career-reflection-answer.repository';
import { CareerReflectionAnswerMapper } from '../mappers/career-reflection-answer.mapper';
import { IPaginationOptions } from '../../../../../utils/types/pagination-options';

@Injectable()
export class CareerReflectionAnswerRelationalRepository implements CareerReflectionAnswerRepository {
  constructor(
    @InjectRepository(CareerReflectionAnswerEntity)
    private readonly careerReflectionAnswerRepository: Repository<CareerReflectionAnswerEntity>,
  ) {}

  async create(data: CareerReflectionAnswer): Promise<CareerReflectionAnswer> {
    const persistenceModel = CareerReflectionAnswerMapper.toPersistence(data);
    const newEntity = await this.careerReflectionAnswerRepository.save(
      this.careerReflectionAnswerRepository.create(persistenceModel),
    );
    return CareerReflectionAnswerMapper.toDomain(newEntity);
  }

  async findAllWithPagination({
    paginationOptions,
  }: {
    paginationOptions: IPaginationOptions;
  }): Promise<CareerReflectionAnswer[]> {
    const entities = await this.careerReflectionAnswerRepository.find({
      skip: (paginationOptions.page - 1) * paginationOptions.limit,
      take: paginationOptions.limit,
    });

    return entities.map((entity) =>
      CareerReflectionAnswerMapper.toDomain(entity),
    );
  }

  async findById(
    id: CareerReflectionAnswer['id'],
  ): Promise<NullableType<CareerReflectionAnswer>> {
    const entity = await this.careerReflectionAnswerRepository.findOne({
      where: { id },
    });

    return entity ? CareerReflectionAnswerMapper.toDomain(entity) : null;
  }

  async findByIds(
    ids: CareerReflectionAnswer['id'][],
  ): Promise<CareerReflectionAnswer[]> {
    const entities = await this.careerReflectionAnswerRepository.find({
      where: { id: In(ids) },
    });

    return entities.map((entity) =>
      CareerReflectionAnswerMapper.toDomain(entity),
    );
  }

  async findByEnrollmentId(
    enrollmentId: string,
  ): Promise<CareerReflectionAnswer[]> {
    const entities = await this.careerReflectionAnswerRepository.find({
      where: { enrollment: { id: enrollmentId } },
    });

    return entities.map((entity) =>
      CareerReflectionAnswerMapper.toDomain(entity),
    );
  }

  async update(
    id: CareerReflectionAnswer['id'],
    payload: Partial<CareerReflectionAnswer>,
  ): Promise<CareerReflectionAnswer> {
    const entity = await this.careerReflectionAnswerRepository.findOne({
      where: { id },
    });

    if (!entity) {
      throw new Error('Record not found');
    }

    const updatedEntity = await this.careerReflectionAnswerRepository.save(
      this.careerReflectionAnswerRepository.create(
        CareerReflectionAnswerMapper.toPersistence({
          ...CareerReflectionAnswerMapper.toDomain(entity),
          ...omitUndefined(payload),
        }),
      ),
    );

    return CareerReflectionAnswerMapper.toDomain(updatedEntity);
  }

  async remove(id: CareerReflectionAnswer['id']): Promise<void> {
    await this.careerReflectionAnswerRepository.delete(id);
  }

  /**
   * A real `INSERT … ON CONFLICT` against `UQ_cra_enrollment_question`.
   *
   * The previous write path read the existing answers and then chose between
   * insert and update, with no constraint behind it — two submits arriving
   * together could both see "no row" and both insert. The constraint makes a
   * duplicate impossible and this statement makes the race harmless.
   *
   * `submitted_at` is set on insert only, so it keeps meaning "first
   * submitted"; `updated_at` records the latest change. The dashboard windows
   * responses on `submitted_at`, and an edit made a month later should not
   * move a response into this month.
   */
  async upsertForEnrollment(
    enrollmentId: string,
    answers: {
      questionId: string;
      ratingAnswer: number | null;
      textAnswer: string | null;
    }[],
  ): Promise<void> {
    if (answers.length === 0) {
      return;
    }

    await this.careerReflectionAnswerRepository.manager.transaction(
      async (manager) => {
        for (const answer of answers) {
          await manager.query(
            `INSERT INTO "career_reflection_answer"
               ("enrollment_id", "question_id", "rating_answer", "text_answer",
                "submitted_at")
             VALUES ($1, $2, $3, $4, now())
             ON CONFLICT ON CONSTRAINT "UQ_cra_enrollment_question"
             DO UPDATE SET "rating_answer" = EXCLUDED."rating_answer",
                           "text_answer"   = EXCLUDED."text_answer",
                           "updated_at"    = now()`,
            [
              enrollmentId,
              answer.questionId,
              answer.ratingAnswer,
              answer.textAnswer,
            ],
          );
        }
      },
    );
  }

  async removeByEnrollmentId(enrollmentId: string): Promise<void> {
    await this.careerReflectionAnswerRepository.delete({
      enrollment: { id: enrollmentId },
    });
  }
}
