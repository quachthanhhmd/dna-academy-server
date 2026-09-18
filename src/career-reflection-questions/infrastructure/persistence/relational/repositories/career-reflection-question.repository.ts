import { Injectable } from '@nestjs/common';
import { omitUndefined } from '../../../../../utils/omit-undefined';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { CareerReflectionQuestionEntity } from '../entities/career-reflection-question.entity';
import { NullableType } from '../../../../../utils/types/nullable.type';
import { CareerReflectionQuestion } from '../../../../domain/career-reflection-question';
import { CareerReflectionQuestionRepository } from '../../career-reflection-question.repository';
import { CareerReflectionQuestionMapper } from '../mappers/career-reflection-question.mapper';
import { IPaginationOptions } from '../../../../../utils/types/pagination-options';

@Injectable()
export class CareerReflectionQuestionRelationalRepository implements CareerReflectionQuestionRepository {
  constructor(
    @InjectRepository(CareerReflectionQuestionEntity)
    private readonly careerReflectionQuestionRepository: Repository<CareerReflectionQuestionEntity>,
  ) {}

  async create(
    data: CareerReflectionQuestion,
  ): Promise<CareerReflectionQuestion> {
    const persistenceModel = CareerReflectionQuestionMapper.toPersistence(data);
    const newEntity = await this.careerReflectionQuestionRepository.save(
      this.careerReflectionQuestionRepository.create(persistenceModel),
    );
    return CareerReflectionQuestionMapper.toDomain(newEntity);
  }

  async findAllWithPagination({
    paginationOptions,
  }: {
    paginationOptions: IPaginationOptions;
  }): Promise<CareerReflectionQuestion[]> {
    const entities = await this.careerReflectionQuestionRepository.find({
      skip: (paginationOptions.page - 1) * paginationOptions.limit,
      take: paginationOptions.limit,
    });

    return entities.map((entity) =>
      CareerReflectionQuestionMapper.toDomain(entity),
    );
  }

  async findById(
    id: CareerReflectionQuestion['id'],
  ): Promise<NullableType<CareerReflectionQuestion>> {
    const entity = await this.careerReflectionQuestionRepository.findOne({
      where: { id },
    });

    return entity ? CareerReflectionQuestionMapper.toDomain(entity) : null;
  }

  async findByIds(
    ids: CareerReflectionQuestion['id'][],
  ): Promise<CareerReflectionQuestion[]> {
    const entities = await this.careerReflectionQuestionRepository.find({
      where: { id: In(ids) },
    });

    return entities.map((entity) =>
      CareerReflectionQuestionMapper.toDomain(entity),
    );
  }

  /** Course-specific questions plus the global ones (courseId IS NULL). */
  async findForCourse(courseId: string): Promise<CareerReflectionQuestion[]> {
    const entities = await this.careerReflectionQuestionRepository
      .createQueryBuilder('question')
      .where('question.isActive = true')
      .andWhere('(question.course = :courseId OR question.course IS NULL)', {
        courseId,
      })
      .orderBy('question.displayOrder', 'ASC')
      // A course-specific question sharing a display order with a global one
      // must not swap places between two loads of the same form.
      .addOrderBy('question.course', 'ASC', 'NULLS FIRST')
      .addOrderBy('question.createdAt', 'ASC')
      .getMany();

    return entities.map((entity) =>
      CareerReflectionQuestionMapper.toDomain(entity),
    );
  }

  /**
   * Read straight from `career_reflection_answer` rather than through the
   * answers module, which already depends on this one — importing it back
   * would make the two modules circular for the sake of a count.
   */
  async countAnswers(id: CareerReflectionQuestion['id']): Promise<number> {
    const [row] = await this.careerReflectionQuestionRepository.manager.query(
      `SELECT COUNT(*)::int AS n FROM "career_reflection_answer" WHERE "question_id" = $1`,
      [id],
    );

    return row?.n ?? 0;
  }

  async answeredOptionKeys(
    id: CareerReflectionQuestion['id'],
  ): Promise<number[]> {
    const rows: { key: number }[] =
      await this.careerReflectionQuestionRepository.manager.query(
        `SELECT DISTINCT "rating_answer" AS key
           FROM "career_reflection_answer"
          WHERE "question_id" = $1 AND "rating_answer" IS NOT NULL`,
        [id],
      );

    return rows.map((row) => Number(row.key));
  }

  async findForAdmin(filters: {
    courseId?: string;
    isActive?: boolean;
  }): Promise<CareerReflectionQuestion[]> {
    const query = this.careerReflectionQuestionRepository
      .createQueryBuilder('question')
      .leftJoinAndSelect('question.course', 'course');

    if (filters.courseId) {
      query.andWhere('question.course = :courseId', {
        courseId: filters.courseId,
      });
    }

    if (filters.isActive !== undefined) {
      query.andWhere('question.isActive = :isActive', {
        isActive: filters.isActive,
      });
    }

    const entities = await query
      .orderBy('question.displayOrder', 'ASC')
      .addOrderBy('question.createdAt', 'ASC')
      .getMany();

    return entities.map((entity) =>
      CareerReflectionQuestionMapper.toDomain(entity),
    );
  }

  async update(
    id: CareerReflectionQuestion['id'],
    payload: Partial<CareerReflectionQuestion>,
  ): Promise<CareerReflectionQuestion> {
    const entity = await this.careerReflectionQuestionRepository.findOne({
      where: { id },
    });

    if (!entity) {
      throw new Error('Record not found');
    }

    const updatedEntity = await this.careerReflectionQuestionRepository.save(
      this.careerReflectionQuestionRepository.create(
        CareerReflectionQuestionMapper.toPersistence({
          ...CareerReflectionQuestionMapper.toDomain(entity),
          ...omitUndefined(payload),
        }),
      ),
    );

    return CareerReflectionQuestionMapper.toDomain(updatedEntity);
  }

  async remove(id: CareerReflectionQuestion['id']): Promise<void> {
    await this.careerReflectionQuestionRepository.delete(id);
  }
}
