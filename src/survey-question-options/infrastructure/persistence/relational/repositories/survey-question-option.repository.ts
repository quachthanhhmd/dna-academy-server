import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { SurveyQuestionOptionEntity } from '../entities/survey-question-option.entity';
import { NullableType } from '../../../../../utils/types/nullable.type';
import { SurveyQuestionOption } from '../../../../domain/survey-question-option';
import {
  SurveyOptionFields,
  SurveyOptionRow,
  SurveyQuestionOptionRepository,
} from '../../survey-question-option.repository';
import { SurveyQuestionOptionMapper } from '../mappers/survey-question-option.mapper';
import { IPaginationOptions } from '../../../../../utils/types/pagination-options';

@Injectable()
export class SurveyQuestionOptionRelationalRepository implements SurveyQuestionOptionRepository {
  constructor(
    @InjectRepository(SurveyQuestionOptionEntity)
    private readonly surveyQuestionOptionRepository: Repository<SurveyQuestionOptionEntity>,
  ) {}

  async create(data: SurveyQuestionOption): Promise<SurveyQuestionOption> {
    const persistenceModel = SurveyQuestionOptionMapper.toPersistence(data);
    const newEntity = await this.surveyQuestionOptionRepository.save(
      this.surveyQuestionOptionRepository.create(persistenceModel),
    );
    return SurveyQuestionOptionMapper.toDomain(newEntity);
  }

  async findAllWithPagination({
    paginationOptions,
  }: {
    paginationOptions: IPaginationOptions;
  }): Promise<SurveyQuestionOption[]> {
    const entities = await this.surveyQuestionOptionRepository.find({
      skip: (paginationOptions.page - 1) * paginationOptions.limit,
      take: paginationOptions.limit,
    });

    return entities.map((entity) =>
      SurveyQuestionOptionMapper.toDomain(entity),
    );
  }

  async findById(
    id: SurveyQuestionOption['id'],
  ): Promise<NullableType<SurveyQuestionOption>> {
    const entity = await this.surveyQuestionOptionRepository.findOne({
      where: { id },
    });

    return entity ? SurveyQuestionOptionMapper.toDomain(entity) : null;
  }

  async findByIds(
    ids: SurveyQuestionOption['id'][],
  ): Promise<SurveyQuestionOption[]> {
    const entities = await this.surveyQuestionOptionRepository.find({
      where: { id: In(ids) },
    });

    return entities.map((entity) =>
      SurveyQuestionOptionMapper.toDomain(entity),
    );
  }

  async update(
    id: SurveyQuestionOption['id'],
    payload: Partial<SurveyQuestionOption>,
  ): Promise<SurveyQuestionOption> {
    const entity = await this.surveyQuestionOptionRepository.findOne({
      where: { id },
    });

    if (!entity) {
      throw new Error('Record not found');
    }

    const updatedEntity = await this.surveyQuestionOptionRepository.save(
      this.surveyQuestionOptionRepository.create(
        SurveyQuestionOptionMapper.toPersistence({
          ...SurveyQuestionOptionMapper.toDomain(entity),
          ...payload,
        }),
      ),
    );

    return SurveyQuestionOptionMapper.toDomain(updatedEntity);
  }

  async remove(id: SurveyQuestionOption['id']): Promise<void> {
    await this.surveyQuestionOptionRepository.delete(id);
  }

  async findByQuestions(
    questionIds: string[],
    includeArchived = false,
  ): Promise<SurveyOptionRow[]> {
    if (!questionIds.length) return [];
    const query = this.surveyQuestionOptionRepository
      .createQueryBuilder('o')
      .select([
        'o.id AS "id"',
        'o.question_id AS "questionId"',
        'o.option_text AS "optionText"',
        'o.display_order AS "displayOrder"',
        'o.archived_at AS "archivedAt"',
      ])
      .where('o.question_id IN (:...questionIds)', { questionIds });
    if (!includeArchived) query.andWhere('o.archived_at IS NULL');
    const rows = await query
      .orderBy('o.display_order', 'ASC')
      .addOrderBy('o.created_at', 'ASC')
      .getRawMany<SurveyOptionRow>();
    return rows.map((row) => ({
      ...row,
      displayOrder: Number(row.displayOrder),
    }));
  }

  async createForQuestion(
    questionId: string,
    fields: SurveyOptionFields,
  ): Promise<string> {
    const saved = await this.surveyQuestionOptionRepository.save(
      this.surveyQuestionOptionRepository.create({
        ...fields,
        question: { id: questionId },
      }),
    );
    return saved.id;
  }

  async patch(id: string, fields: Partial<SurveyOptionFields>): Promise<void> {
    await this.surveyQuestionOptionRepository.update({ id }, fields);
  }

  async archive(ids: string[]): Promise<void> {
    if (!ids.length) return;
    await this.surveyQuestionOptionRepository.update(
      { id: In(ids) },
      { archivedAt: new Date() },
    );
  }

  async removeMany(ids: string[]): Promise<void> {
    if (!ids.length) return;
    await this.surveyQuestionOptionRepository.delete({ id: In(ids) });
  }
}
