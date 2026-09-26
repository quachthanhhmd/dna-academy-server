import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { FormDefinitionEntity } from '../../../../form-definition/infrastructure/persistence/relational/entities/form-definition.entity';
import { FormQuestionEntity } from '../../../../form-question/infrastructure/persistence/relational/entities/form-question.entity';
import { FormQuestionOptionEntity } from '../../../../form-question-option/infrastructure/persistence/relational/entities/form-question-option.entity';
import { FormSubmissionEntity } from '../../../../form-submission/infrastructure/persistence/relational/entities/form-submission.entity';
import { FormAnswerEntity } from '../../../../form-answer/infrastructure/persistence/relational/entities/form-answer.entity';
import { FormAnswerOptionEntity } from '../../../../form-answer-option/infrastructure/persistence/relational/entities/form-answer-option.entity';
import { FormSubmissionConsentEntity } from '../../../../form-submission-consent/infrastructure/persistence/relational/entities/form-submission-consent.entity';
import { FormSubmissionEventEntity } from '../../../../form-submission-event/infrastructure/persistence/relational/entities/form-submission-event.entity';

/**
 * All reads and writes the forms API needs, in one place, over the eight
 * entities. The generated per-resource repositories only do CRUD by id; every
 * query here is relational (a definition with its questions and allowlists, a
 * submission with its answers), so it uses query builders rather than widening
 * eight separate repository interfaces.
 */
@Injectable()
export class FormsRepository {
  constructor(
    @InjectRepository(FormDefinitionEntity)
    private readonly definitions: Repository<FormDefinitionEntity>,
    @InjectRepository(FormQuestionEntity)
    private readonly questions: Repository<FormQuestionEntity>,
    @InjectRepository(FormQuestionOptionEntity)
    private readonly options: Repository<FormQuestionOptionEntity>,
    @InjectRepository(FormSubmissionEntity)
    private readonly submissions: Repository<FormSubmissionEntity>,
    @InjectRepository(FormAnswerEntity)
    private readonly answers: Repository<FormAnswerEntity>,
    @InjectRepository(FormAnswerOptionEntity)
    private readonly answerOptions: Repository<FormAnswerOptionEntity>,
    @InjectRepository(FormSubmissionConsentEntity)
    private readonly consents: Repository<FormSubmissionConsentEntity>,
    @InjectRepository(FormSubmissionEventEntity)
    private readonly events: Repository<FormSubmissionEventEntity>,
  ) {}

  findDefinitionByCode(code: string): Promise<FormDefinitionEntity | null> {
    return this.definitions.findOne({ where: { code, isActive: true } });
  }

  findDefinitions(): Promise<FormDefinitionEntity[]> {
    return this.definitions.find({ order: { code: 'ASC' } });
  }

  /**
   * Ordered by insertion (`createdAt`, i.e. seed order), not by
   * `displayOrder`: displayOrder restarts at 1 inside every section, so a
   * global sort interleaves the sections — `consent`'s first question would
   * sort alongside `learning_needs`'s. The authored order is what groups the
   * sections the way the form reads; `displayOrder` then orders within one.
   */
  findQuestions(definitionId: string): Promise<FormQuestionEntity[]> {
    return this.questions.find({
      where: { formDefinition: { id: definitionId } },
      relations: ['parentQuestion'],
      order: { createdAt: 'ASC' },
    });
  }

  findOptionsForQuestions(
    questionIds: string[],
  ): Promise<FormQuestionOptionEntity[]> {
    if (questionIds.length === 0) return Promise.resolve([]);
    return this.options.find({
      where: { question: { id: In(questionIds) } },
      // The `question` relation is read back when grouping options under
      // their question; without it every allowlist row resolves to a
      // question of `undefined`.
      relations: ['question'],
      order: { displayOrder: 'ASC' },
    });
  }

  async createSubmission(
    data: Partial<FormSubmissionEntity>,
  ): Promise<FormSubmissionEntity> {
    const entity = this.submissions.create(data);
    return this.submissions.save(entity);
  }

  /**
   * The previous live row for the same (form, email, course), if any.
   *
   * `UQ_form_submission_live` is a partial unique index over exactly this
   * triple, so this has to be read *before* inserting the replacement —
   * inserting first is what a re-submission does when it forgets to clear the
   * old row, and the index rejects it.
   */
  findLiveSubmission(
    definitionId: string,
    emailNormalized: string,
    courseId: string | null,
  ): Promise<FormSubmissionEntity | null> {
    return this.submissions.findOne({
      where: {
        formDefinition: { id: definitionId },
        emailNormalized,
        isLatest: true,
        selectedCourse: courseId ? { id: courseId } : undefined,
      },
    });
  }

  /**
   * The re-submission rule (spec §2.3, C6): append-only. Called *between*
   * clearing the old row and inserting the new one — the previous row is
   * flagged `is_latest = false` and points at its replacement, so the demand
   * timeline keeps both answers.
   */
  async supersedeLiveSubmission(
    previousId: string,
    supersededById: string,
  ): Promise<void> {
    await this.submissions.update(previousId, {
      isLatest: false,
      supersededBy: { id: supersededById } as FormSubmissionEntity,
    } as never);
  }

  saveAnswers(rows: Partial<FormAnswerEntity>[]): Promise<FormAnswerEntity[]> {
    if (rows.length === 0) return Promise.resolve([]);
    return this.answers.save(this.answers.create(rows));
  }

  saveAnswerOptions(
    rows: Partial<FormAnswerOptionEntity>[],
  ): Promise<FormAnswerOptionEntity[]> {
    if (rows.length === 0) return Promise.resolve([]);
    return this.answerOptions.save(this.answerOptions.create(rows));
  }

  saveConsents(
    rows: Partial<FormSubmissionConsentEntity>[],
  ): Promise<FormSubmissionConsentEntity[]> {
    if (rows.length === 0) return Promise.resolve([]);
    return this.consents.save(this.consents.create(rows));
  }

  saveEvent(
    data: Partial<FormSubmissionEventEntity>,
  ): Promise<FormSubmissionEventEntity> {
    return this.events.save(this.events.create(data));
  }

  findSubmissionById(id: string): Promise<FormSubmissionEntity | null> {
    return this.submissions.findOne({
      where: { id },
      relations: ['formDefinition', 'assignedToUser', 'selectedCourse'],
    });
  }

  findAnswersForSubmissions(
    submissionIds: string[],
  ): Promise<FormAnswerEntity[]> {
    if (submissionIds.length === 0) return Promise.resolve([]);
    return this.answers.find({
      where: { submission: { id: In(submissionIds) } },
      relations: ['question', 'submission'],
    });
  }

  findAnswerOptionsForSubmissions(
    submissionIds: string[],
  ): Promise<FormAnswerOptionEntity[]> {
    if (submissionIds.length === 0) return Promise.resolve([]);
    return this.answerOptions.find({
      where: { submission: { id: In(submissionIds) } },
      // `answer` groups options under their question; `question` is what the
      // roster reads to find the `session_slot` answers. Without both, every
      // row reads as an option of an undefined answer.
      relations: ['answer', 'question', 'submission'],
    });
  }

  findConsentsForSubmission(
    submissionId: string,
  ): Promise<FormSubmissionConsentEntity[]> {
    return this.consents.find({
      where: { submission: { id: submissionId } },
      order: { acceptedAt: 'ASC' },
    });
  }

  findEventsForSubmission(
    submissionId: string,
  ): Promise<FormSubmissionEventEntity[]> {
    return this.events.find({
      where: { submission: { id: submissionId } },
      order: { createdAt: 'ASC' },
    });
  }

  createEventsQuery() {
    return this.events.createQueryBuilder('event');
  }

  get submissionsRepo(): Repository<FormSubmissionEntity> {
    return this.submissions;
  }

  get answersRepo(): Repository<FormAnswerEntity> {
    return this.answers;
  }

  get answerOptionsRepo(): Repository<FormAnswerOptionEntity> {
    return this.answerOptions;
  }
}
