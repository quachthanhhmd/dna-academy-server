import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { SurveyQuestionEntity } from '../entities/survey-question.entity';
import { NullableType } from '../../../../../utils/types/nullable.type';
import { SurveyQuestion } from '../../../../domain/survey-question';
import {
  SurveyQuestionFields,
  SurveyQuestionRepository,
  SurveyQuestionRow,
} from '../../survey-question.repository';
import { SurveyQuestionMapper } from '../mappers/survey-question.mapper';
import { IPaginationOptions } from '../../../../../utils/types/pagination-options';

@Injectable()
export class SurveyQuestionRelationalRepository implements SurveyQuestionRepository {
  constructor(
    @InjectRepository(SurveyQuestionEntity)
    private readonly surveyQuestionRepository: Repository<SurveyQuestionEntity>,
  ) {}

  async create(data: SurveyQuestion): Promise<SurveyQuestion> {
    const persistenceModel = SurveyQuestionMapper.toPersistence(data);
    const newEntity = await this.surveyQuestionRepository.save(
      this.surveyQuestionRepository.create(persistenceModel),
    );
    return SurveyQuestionMapper.toDomain(newEntity);
  }

  async findAllWithPagination({
    paginationOptions,
  }: {
    paginationOptions: IPaginationOptions;
  }): Promise<SurveyQuestion[]> {
    const entities = await this.surveyQuestionRepository.find({
      skip: (paginationOptions.page - 1) * paginationOptions.limit,
      take: paginationOptions.limit,
    });

    return entities.map((entity) => SurveyQuestionMapper.toDomain(entity));
  }

  async findById(
    id: SurveyQuestion['id'],
  ): Promise<NullableType<SurveyQuestion>> {
    const entity = await this.surveyQuestionRepository.findOne({
      where: { id },
    });

    return entity ? SurveyQuestionMapper.toDomain(entity) : null;
  }

  async findByIds(ids: SurveyQuestion['id'][]): Promise<SurveyQuestion[]> {
    const entities = await this.surveyQuestionRepository.find({
      where: { id: In(ids) },
    });

    return entities.map((entity) => SurveyQuestionMapper.toDomain(entity));
  }

  async update(
    id: SurveyQuestion['id'],
    payload: Partial<SurveyQuestion>,
  ): Promise<SurveyQuestion> {
    const entity = await this.surveyQuestionRepository.findOne({
      where: { id },
    });

    if (!entity) {
      throw new Error('Record not found');
    }

    const updatedEntity = await this.surveyQuestionRepository.save(
      this.surveyQuestionRepository.create(
        SurveyQuestionMapper.toPersistence({
          ...SurveyQuestionMapper.toDomain(entity),
          ...payload,
        }),
      ),
    );

    return SurveyQuestionMapper.toDomain(updatedEntity);
  }

  async remove(id: SurveyQuestion['id']): Promise<void> {
    await this.surveyQuestionRepository.delete(id);
  }

  async findByLecture(
    lectureId: string,
    includeArchived = false,
  ): Promise<SurveyQuestionRow[]> {
    const query = this.surveyQuestionRepository
      .createQueryBuilder('q')
      .select([
        'q.id AS "id"',
        'q.lecture_id AS "lectureId"',
        'q.question_type AS "questionType"',
        'q.question_text AS "questionText"',
        'q.is_required AS "isRequired"',
        'q.display_order AS "displayOrder"',
        'q.rating_max AS "ratingMax"',
        'q.rating_label_min AS "ratingLabelMin"',
        'q.rating_label_max AS "ratingLabelMax"',
        'q.archived_at AS "archivedAt"',
      ])
      .where('q.lecture_id = :lectureId', { lectureId });
    if (!includeArchived) query.andWhere('q.archived_at IS NULL');
    const rows = await query
      .orderBy('q.display_order', 'ASC')
      .addOrderBy('q.created_at', 'ASC')
      .getRawMany<SurveyQuestionRow>();
    return rows.map((row) => ({
      ...row,
      ratingMax: row.ratingMax === null ? null : Number(row.ratingMax),
      displayOrder: Number(row.displayOrder),
    }));
  }

  async createForLecture(
    lectureId: string,
    fields: SurveyQuestionFields,
  ): Promise<string> {
    const saved = await this.surveyQuestionRepository.save(
      this.surveyQuestionRepository.create({
        ...fields,
        lecture: { id: lectureId },
      }),
    );
    return saved.id;
  }

  async patch(
    id: string,
    fields: Partial<SurveyQuestionFields>,
  ): Promise<void> {
    await this.surveyQuestionRepository.update({ id }, fields);
  }

  async archive(ids: string[]): Promise<void> {
    if (!ids.length) return;
    await this.surveyQuestionRepository.update(
      { id: In(ids) },
      { archivedAt: new Date() },
    );
  }

  async removeMany(ids: string[]): Promise<void> {
    if (!ids.length) return;
    await this.surveyQuestionRepository.delete({ id: In(ids) });
  }
}
