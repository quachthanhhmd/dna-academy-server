import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { SurveyAnswerEntity } from '../entities/survey-answer.entity';
import { NullableType } from '../../../../../utils/types/nullable.type';
import { SurveyAnswer } from '../../../../domain/survey-answer';
import {
  SurveyAnswerRepository,
  SurveyAnswerRow,
} from '../../survey-answer.repository';
import { SurveyAnswerMapper } from '../mappers/survey-answer.mapper';
import { IPaginationOptions } from '../../../../../utils/types/pagination-options';

@Injectable()
export class SurveyAnswerRelationalRepository implements SurveyAnswerRepository {
  constructor(
    @InjectRepository(SurveyAnswerEntity)
    private readonly surveyAnswerRepository: Repository<SurveyAnswerEntity>,
  ) {}

  async create(data: SurveyAnswer): Promise<SurveyAnswer> {
    const persistenceModel = SurveyAnswerMapper.toPersistence(data);
    const newEntity = await this.surveyAnswerRepository.save(
      this.surveyAnswerRepository.create(persistenceModel),
    );
    return SurveyAnswerMapper.toDomain(newEntity);
  }

  async findAllWithPagination({
    paginationOptions,
  }: {
    paginationOptions: IPaginationOptions;
  }): Promise<SurveyAnswer[]> {
    const entities = await this.surveyAnswerRepository.find({
      skip: (paginationOptions.page - 1) * paginationOptions.limit,
      take: paginationOptions.limit,
    });

    return entities.map((entity) => SurveyAnswerMapper.toDomain(entity));
  }

  async findById(id: SurveyAnswer['id']): Promise<NullableType<SurveyAnswer>> {
    const entity = await this.surveyAnswerRepository.findOne({
      where: { id },
    });

    return entity ? SurveyAnswerMapper.toDomain(entity) : null;
  }

  async findByIds(ids: SurveyAnswer['id'][]): Promise<SurveyAnswer[]> {
    const entities = await this.surveyAnswerRepository.find({
      where: { id: In(ids) },
    });

    return entities.map((entity) => SurveyAnswerMapper.toDomain(entity));
  }

  async update(
    id: SurveyAnswer['id'],
    payload: Partial<SurveyAnswer>,
  ): Promise<SurveyAnswer> {
    const entity = await this.surveyAnswerRepository.findOne({
      where: { id },
    });

    if (!entity) {
      throw new Error('Record not found');
    }

    const updatedEntity = await this.surveyAnswerRepository.save(
      this.surveyAnswerRepository.create(
        SurveyAnswerMapper.toPersistence({
          ...SurveyAnswerMapper.toDomain(entity),
          ...payload,
        }),
      ),
    );

    return SurveyAnswerMapper.toDomain(updatedEntity);
  }

  async remove(id: SurveyAnswer['id']): Promise<void> {
    await this.surveyAnswerRepository.delete(id);
  }

  async findByResponse(responseId: string): Promise<SurveyAnswerRow[]> {
    const rows = await this.surveyAnswerRepository
      .createQueryBuilder('a')
      .select([
        'a.response_id AS "responseId"',
        'a.question_id AS "questionId"',
        'a.option_id AS "optionId"',
        'a.text_answer AS "textAnswer"',
        'a.rating_value AS "ratingValue"',
      ])
      .where('a.response_id = :responseId', { responseId })
      .orderBy('a.created_at', 'ASC')
      .getRawMany<SurveyAnswerRow>();
    return rows.map((row) => ({
      ...row,
      ratingValue: row.ratingValue === null ? null : Number(row.ratingValue),
    }));
  }

  async replaceForQuestions(
    responseId: string,
    questionIds: string[],
    rows: Omit<SurveyAnswerRow, 'responseId'>[],
  ): Promise<void> {
    await this.surveyAnswerRepository.manager.transaction(async (manager) => {
      const repo = manager.getRepository(SurveyAnswerEntity);
      if (questionIds.length) {
        await repo.delete({
          response: { id: responseId },
          question: { id: In(questionIds) },
        });
      }
      if (rows.length) {
        await repo.save(
          rows.map((row) =>
            repo.create({
              response: { id: responseId },
              question: { id: row.questionId },
              option: row.optionId ? { id: row.optionId } : null,
              textAnswer: row.textAnswer,
              ratingValue: row.ratingValue,
            }),
          ),
        );
      }
    });
  }

  async countByQuestions(questionIds: string[]): Promise<Map<string, number>> {
    return this.countBy('question_id', questionIds);
  }

  async countByOptions(optionIds: string[]): Promise<Map<string, number>> {
    return this.countBy('option_id', optionIds);
  }

  private async countBy(
    column: 'question_id' | 'option_id',
    ids: string[],
  ): Promise<Map<string, number>> {
    if (!ids.length) return new Map();
    const rows = await this.surveyAnswerRepository
      .createQueryBuilder('a')
      .select(`a.${column}`, 'id')
      .addSelect('COUNT(*)', 'count')
      .where(`a.${column} IN (:...ids)`, { ids })
      .groupBy(`a.${column}`)
      .getRawMany<{ id: string; count: string }>();
    return new Map(rows.map((row) => [row.id, Number(row.count)]));
  }
}
