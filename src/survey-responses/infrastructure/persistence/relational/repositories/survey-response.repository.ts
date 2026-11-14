import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { SurveyResponseEntity } from '../entities/survey-response.entity';
import { NullableType } from '../../../../../utils/types/nullable.type';
import { SurveyResponse } from '../../../../domain/survey-response';
import { SurveyResponseRepository } from '../../survey-response.repository';
import { SurveyResponseMapper } from '../mappers/survey-response.mapper';
import { IPaginationOptions } from '../../../../../utils/types/pagination-options';

@Injectable()
export class SurveyResponseRelationalRepository implements SurveyResponseRepository {
  constructor(
    @InjectRepository(SurveyResponseEntity)
    private readonly surveyResponseRepository: Repository<SurveyResponseEntity>,
  ) {}

  async create(data: SurveyResponse): Promise<SurveyResponse> {
    const persistenceModel = SurveyResponseMapper.toPersistence(data);
    const newEntity = await this.surveyResponseRepository.save(
      this.surveyResponseRepository.create(persistenceModel),
    );
    return SurveyResponseMapper.toDomain(newEntity);
  }

  async findAllWithPagination({
    paginationOptions,
  }: {
    paginationOptions: IPaginationOptions;
  }): Promise<SurveyResponse[]> {
    const entities = await this.surveyResponseRepository.find({
      skip: (paginationOptions.page - 1) * paginationOptions.limit,
      take: paginationOptions.limit,
    });

    return entities.map((entity) => SurveyResponseMapper.toDomain(entity));
  }

  async findById(
    id: SurveyResponse['id'],
  ): Promise<NullableType<SurveyResponse>> {
    const entity = await this.surveyResponseRepository.findOne({
      where: { id },
    });

    return entity ? SurveyResponseMapper.toDomain(entity) : null;
  }

  async findByIds(ids: SurveyResponse['id'][]): Promise<SurveyResponse[]> {
    const entities = await this.surveyResponseRepository.find({
      where: { id: In(ids) },
    });

    return entities.map((entity) => SurveyResponseMapper.toDomain(entity));
  }

  async update(
    id: SurveyResponse['id'],
    payload: Partial<SurveyResponse>,
  ): Promise<SurveyResponse> {
    const entity = await this.surveyResponseRepository.findOne({
      where: { id },
    });

    if (!entity) {
      throw new Error('Record not found');
    }

    const updatedEntity = await this.surveyResponseRepository.save(
      this.surveyResponseRepository.create(
        SurveyResponseMapper.toPersistence({
          ...SurveyResponseMapper.toDomain(entity),
          ...payload,
        }),
      ),
    );

    return SurveyResponseMapper.toDomain(updatedEntity);
  }

  async remove(id: SurveyResponse['id']): Promise<void> {
    await this.surveyResponseRepository.delete(id);
  }

  async findOne(
    lectureId: string,
    enrollmentId: string,
  ): Promise<{ id: string; submittedAt: Date } | null> {
    const entity = await this.surveyResponseRepository.findOne({
      where: { lecture: { id: lectureId }, enrollment: { id: enrollmentId } },
    });
    return entity ? { id: entity.id, submittedAt: entity.submittedAt } : null;
  }

  async upsert(
    lectureId: string,
    enrollmentId: string,
    submittedAt: Date,
  ): Promise<string> {
    // Read-then-write; UQ_survey_response_lecture_enrollment refuses a
    // duplicate if two submits race.
    const existing = await this.findOne(lectureId, enrollmentId);
    const saved = await this.surveyResponseRepository.save(
      this.surveyResponseRepository.create({
        ...(existing ? { id: existing.id } : {}),
        lecture: { id: lectureId },
        enrollment: { id: enrollmentId },
        submittedAt,
      }),
    );
    return saved.id;
  }

  async removeByEnrollmentId(enrollmentId: string): Promise<void> {
    await this.surveyResponseRepository.delete({
      enrollment: { id: enrollmentId },
    });
  }
}
