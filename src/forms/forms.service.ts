import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { createHash, createHmac } from 'node:crypto';
import { MasterDataCodesService } from '../master-data-codes/master-data-codes.service';
import { UsersService } from '../users/users.service';
import { LocaleContext } from '../utils/i18n/locale-context';
import { pickLocalized } from '../utils/i18n/pick-localized';
import { User } from '../users/domain/user';
import {
  FormDefinitionDto,
  FormOptionDto,
  FormPrefillDto,
  FormQuestionDto,
  FormSectionDto,
  FormSubmissionCreatedDto,
} from './dto/form-definition.dto';
import {
  CreateFormSubmissionDto,
  FormAnswerInputDto,
} from './dto/create-form-submission.dto';
import {
  FindOverviewDto,
  FindRosterDto,
  FindSubmissionsDto,
  FormOverviewKpiDto,
  FormSubmissionAnswerDto,
  FormSubmissionDetailDto,
  FormSubmissionListItemDto,
  SubmissionStatus,
} from './dto/form-admin.dto';
import { FormDefinitionEntity } from '../form-definition/infrastructure/persistence/relational/entities/form-definition.entity';
import { FormQuestionEntity } from '../form-question/infrastructure/persistence/relational/entities/form-question.entity';
import { FormAnswerEntity } from '../form-answer/infrastructure/persistence/relational/entities/form-answer.entity';
import { FormSubmissionEntity } from '../form-submission/infrastructure/persistence/relational/entities/form-submission.entity';
import { FormsRepository } from './infrastructure/persistence/relational/forms.repository';

/** Spec §8 / §11: the fill-time floor and the text bounds. */
export const FORM_MIN_FILL_MS = 2500;
export const FORM_LONG_TEXT_MIN_DEFAULT = 10;
export const FORM_LONG_TEXT_MAX_DEFAULT = 2000;
export const FORM_CONSENT_VERSION = '1.0';
const SUSPICIOUS_FILL_MS = 8000;
const SUSPICIOUS_EMAILS = /^(test|asdf|a{3,}|qwerty)@/i;

type ResolvedQuestion = {
  entity: FormQuestionEntity;
  options: { code: string; name: string; displayOrder: number }[];
};

/**
 * The forms API. Reads a definition tree for the public renderer, validates and
 * writes submissions, and answers the admin list/detail/roster/overview/CSV
 * queries.
 *
 * Server-side validation is independent of the client (spec §4): the client
 * asking the same questions is a convenience, not the guarantee. In
 * particular an option must be in *this question's* allowlist — the group is
 * wider than any one form, so a code valid for Form B can be invalid for A.
 */
@Injectable()
export class FormsService {
  constructor(
    private readonly repository: FormsRepository,
    private readonly masterDataCodes: MasterDataCodesService,
    private readonly usersService: UsersService,
  ) {}

  // ─────────────────────────── public: definition ───────────────────────────

  async getPublicDefinition(code: string): Promise<FormDefinitionDto> {
    const definition = await this.requireDefinition(code);
    const questions = await this.repository.findQuestions(definition.id);
    const resolved = await this.resolveQuestions(definition, questions);

    return this.assembleDefinition(definition, resolved);
  }

  async getPrefill(
    code: string,
    user: User,
    courseId?: string | null,
  ): Promise<FormPrefillDto> {
    await this.requireDefinition(code);

    // The JWT principal carries only `id`; the names and email the form wants
    // to prefll are on the row, so they are read here rather than trusted from
    // the token.
    const full = await this.usersService.findById(user.id);

    return {
      fullName:
        [full?.firstName, full?.lastName].filter(Boolean).join(' ').trim() ||
        null,
      email: full?.email ?? null,
      selectedCourseId: courseId ?? null,
      answers: {},
    };
  }

  // ─────────────────────────── public: submission ───────────────────────────

  async createSubmission(
    code: string,
    dto: CreateFormSubmissionDto,
    user?: User,
    ip?: string,
    userAgent?: string,
  ): Promise<FormSubmissionCreatedDto> {
    const definition = await this.requireDefinition(code);
    const questions = await this.repository.findQuestions(definition.id);
    const resolved = await this.resolveQuestions(definition, questions);
    const byCode = new Map(resolved.map((r) => [r.entity.code, r]));

    const answers = this.validateAnswers(dto.answers, byCode);
    const fullName = this.requiredText(answers, 'full_name');
    const email = this.requiredText(answers, 'email');
    const phone = answers.get('phone')?.text?.trim() || null;
    const emailNormalized = email.trim().toLowerCase();

    this.validateConsents(dto.consents, resolved);
    this.validateCourse(dto.courseId);

    const isSuspicious = this.screenSubmission(emailNormalized, dto);

    /*
      Order matters. `UQ_form_submission_live` is a partial unique index over
      (form, email, course) where `is_latest`, so the replacement must be
      inserted with `isLatest = false`, *then* the previous live row cleared,
      *then* the new row promoted — inserting it live first, or superseding
      afterwards, both trip the index. The window in between has no live row,
      which is the safer of the two failure modes: a crash leaves a
      recoverable orphan rather than two rows claiming to be current.
    */
    const previous = await this.repository.findLiveSubmission(
      definition.id,
      emailNormalized,
      dto.courseId ?? null,
    );

    const submission = await this.repository.createSubmission({
      formDefinition: { id: definition.id } as FormDefinitionEntity,
      formVersion: definition.version,
      user: user ? ({ id: user.id } as never) : undefined,
      fullName,
      email,
      emailNormalized,
      phone,
      primaryFieldCode: this.primaryField(answers, resolved),
      selectedCourse: dto.courseId
        ? ({ id: dto.courseId } as never)
        : undefined,
      status: 'new',
      isLatest: false,
      source: dto.context.source,
      locale: dto.context.locale ?? LocaleContext.current(),
      utm: dto.context.utm ?? null,
      ipHash: ip ? this.hashIp(ip) : null,
      ipHashDay: ip ? new Date().toISOString().slice(0, 10) : null,
      userAgent: userAgent?.slice(0, 255) ?? null,
      isSuspicious,
    });

    try {
      // Clear the old live row *before* promoting this one: the partial index
      // allows only one live row per (form, email, course), so the reverse
      // order would momentarily have two and be rejected.
      if (previous && previous.id !== submission.id) {
        await this.repository.supersedeLiveSubmission(
          previous.id,
          submission.id,
        );
      }
      await this.repository.submissionsRepo.update(submission.id, {
        isLatest: true,
      });
    } catch (error) {
      // A concurrent duplicate beat us to the live slot: this row never
      // became current, so remove the orphan rather than leave two answers
      // for one event.
      await this.repository.submissionsRepo.delete(submission.id);
      throw error;
    }

    await this.persistAnswers(submission, answers, resolved);
    await this.persistConsents(submission, dto.consents);

    await this.repository.saveEvent({
      submission: { id: submission.id } as FormSubmissionEntity,
      event: previous ? 'resubmitted' : 'created',
      toStatus: 'new',
      payload: {
        source: dto.context.source,
        suspicious: isSuspicious,
        superseded: previous?.id ?? null,
      },
    });

    return { id: submission.id, status: submission.status };
  }

  // ───────────────────────────── admin: reads ─────────────────────────────

  async listDefinitions(): Promise<
    { code: string; name: string; version: number; isActive: boolean }[]
  > {
    const definitions = await this.repository.findDefinitions();

    return definitions.map((definition) => ({
      code: definition.code,
      name: pickLocalized(
        definition.nameTranslations,
        LocaleContext.current(),
        definition.code,
      ) as string,
      version: definition.version,
      isActive: definition.isActive,
    }));
  }

  async listSubmissions(filters: FindSubmissionsDto): Promise<{
    data: FormSubmissionListItemDto[];
    total: number;
    hasNextPage: boolean;
  }> {
    const page = filters.page ?? 1;
    const pageSize = filters.pageSize ?? 20;

    const query = this.repository.submissionsRepo
      .createQueryBuilder('submission')
      .leftJoinAndSelect('submission.formDefinition', 'formDefinition');

    if (!filters.includeSuperseded) {
      query.andWhere('submission.isLatest = true');
    }
    if (filters.status) {
      query.andWhere('submission.status = :status', {
        status: filters.status,
      });
    } else {
      query.andWhere('submission.status <> :archived', {
        archived: 'archived',
      });
    }
    if (filters.formCode) {
      query.andWhere('formDefinition.code = :formCode', {
        formCode: filters.formCode,
      });
    }
    if (filters.field) {
      query.andWhere('submission.primaryFieldCode = :field', {
        field: filters.field,
      });
    }
    if (filters.courseId) {
      query.andWhere('submission.selectedCourseId = :courseId', {
        courseId: filters.courseId,
      });
    }
    if (filters.from) {
      query.andWhere('submission.createdAt >= :from', { from: filters.from });
    }
    if (filters.to) {
      query.andWhere('submission.createdAt <= :to', { to: filters.to });
    }
    if (filters.q) {
      const term = `%${filters.q.trim()}%`;
      query.andWhere(
        '(submission.fullName ILIKE :term OR submission.email ILIKE :term OR submission.phone ILIKE :term)',
        { term },
      );
    }

    const sortColumn = this.sortColumn(filters.sort);
    query
      .orderBy(
        `submission.${sortColumn}`,
        (filters.sortOrder ?? 'desc').toUpperCase() as 'ASC' | 'DESC',
      )
      .skip((page - 1) * pageSize)
      .take(pageSize);

    const [entities, total] = await query.getManyAndCount();

    return {
      data: entities.map((entity) => this.toListItem(entity)),
      total,
      hasNextPage: page * pageSize < total,
    };
  }

  async getSubmission(id: string): Promise<FormSubmissionDetailDto> {
    const submission = await this.repository.findSubmissionById(id);
    if (!submission) {
      throw new NotFoundException({
        status: 404,
        error: 'form_submission_not_found',
      });
    }

    const questions = await this.repository.findQuestions(
      submission.formDefinition.id,
    );
    const resolved = await this.resolveQuestions(
      submission.formDefinition,
      questions,
    );
    const byId = new Map(resolved.map((r) => [r.entity.id, r.entity]));
    const locale = LocaleContext.current();
    // `questionCode:optionCode` → the option's current localised name.
    const codeToName = new Map<string, string>();
    for (const { entity, options } of resolved) {
      for (const option of options) {
        codeToName.set(`${entity.code}:${option.code}`, option.name);
      }
    }

    const [answerRows, optionRows, consentRows, eventRows] = await Promise.all([
      this.repository.findAnswersForSubmissions([id]),
      this.repository.findAnswerOptionsForSubmissions([id]),
      this.repository.findConsentsForSubmission(id),
      this.repository.findEventsForSubmission(id),
    ]);

    return {
      ...this.toListItem(submission),
      internalNotes: submission.internalNotes,
      formVersion: submission.formVersion,
      locale: submission.locale,
      source: submission.source,
      consents: consentRows.map((row) => row.consentCode),
      answers: this.toAnswers(answerRows, optionRows, byId, codeToName, locale),
      events: eventRows.map((row) => ({
        event: row.event,
        fromStatus: row.fromStatus,
        toStatus: row.toStatus,
        actorUserId: row.actorUser?.id ?? null,
        createdAt: row.createdAt.toISOString(),
      })),
      supersededById: submission.supersededBy?.id ?? null,
    };
  }

  async updateSubmission(
    id: string,
    dto: {
      status?: SubmissionStatus;
      assignedToUserId?: number | null;
      internalNotes?: string | null;
    },
    actorUserId: number,
  ): Promise<FormSubmissionDetailDto> {
    const submission = await this.repository.findSubmissionById(id);
    if (!submission) {
      throw new NotFoundException({
        status: 404,
        error: 'form_submission_not_found',
      });
    }

    const fromStatus = submission.status;
    const patch: Partial<FormSubmissionEntity> = {};
    if (dto.status !== undefined) patch.status = dto.status;
    if (dto.assignedToUserId !== undefined) {
      patch.assignedToUser = dto.assignedToUserId
        ? ({ id: dto.assignedToUserId } as never)
        : (null as never);
    }
    if (dto.internalNotes !== undefined)
      patch.internalNotes = dto.internalNotes;

    if (Object.keys(patch).length > 0) {
      await this.repository.submissionsRepo.update(id, patch as never);
    }

    if (dto.status !== undefined && dto.status !== fromStatus) {
      await this.repository.saveEvent({
        submission: { id } as FormSubmissionEntity,
        event: 'status_changed',
        fromStatus,
        toStatus: dto.status,
        actorUser: { id: actorUserId } as never,
      });
    }

    return this.getSubmission(id);
  }

  async getSubmissionHistory(id: string): Promise<FormSubmissionListItemDto[]> {
    const submission = await this.repository.findSubmissionById(id);
    if (!submission) {
      throw new NotFoundException({
        status: 404,
        error: 'form_submission_not_found',
      });
    }

    // Walk the superseded chain in both directions from this row.
    const chain: FormSubmissionEntity[] = [submission];
    let cursor: FormSubmissionEntity | null = submission;
    while (cursor?.supersededBy?.id) {
      const next = await this.repository.findSubmissionById(
        cursor.supersededBy.id,
      );
      if (!next) break;
      chain.push(next);
      cursor = next;
    }

    return chain.map((row) => this.toListItem(row));
  }

  async getRoster(filters: FindRosterDto): Promise<
    {
      slot: string;
      count: number;
      submissions: FormSubmissionListItemDto[];
    }[]
  > {
    const query = this.repository.submissionsRepo
      .createQueryBuilder('submission')
      .leftJoinAndSelect('submission.formDefinition', 'formDefinition')
      .where('submission.isLatest = true')
      .andWhere('submission.status <> :archived', { archived: 'archived' });

    if (filters.courseId) {
      query.andWhere('submission.selectedCourseId = :courseId', {
        courseId: filters.courseId,
      });
    }

    const submissions = await query.getMany();
    if (submissions.length === 0) return [];

    const optionRows = await this.repository.findAnswerOptionsForSubmissions(
      submissions.map((row) => row.id),
    );
    const slotBySubmission = new Map<string, string[]>();
    for (const option of optionRows) {
      const question = option.question;
      if (question?.code !== 'session_slot') continue;
      const list = slotBySubmission.get(option.submission.id) ?? [];
      list.push(option.optionCode);
      slotBySubmission.set(option.submission.id, list);
    }

    const groups = new Map<string, FormSubmissionEntity[]>();
    for (const submission of submissions) {
      const slots = slotBySubmission.get(submission.id) ?? ['unspecified'];
      for (const slot of slots) {
        if (filters.slot && slot !== filters.slot) continue;
        const list = groups.get(slot) ?? [];
        list.push(submission);
        groups.set(slot, list);
      }
    }

    return [...groups.entries()]
      .map(([slot, rows]) => ({
        slot,
        count: rows.length,
        submissions: rows.map((row) => this.toListItem(row)),
      }))
      .sort((a, b) => b.count - a.count);
  }

  async getOverview(filters: FindOverviewDto): Promise<FormOverviewKpiDto> {
    const to = filters.to ? new Date(filters.to) : new Date();
    const from = filters.from
      ? new Date(filters.from)
      : new Date(to.getTime() - 90 * 24 * 60 * 60 * 1000);
    const now = Date.now();

    const base = this.repository.submissionsRepo
      .createQueryBuilder('submission')
      .leftJoinAndSelect('submission.formDefinition', 'formDefinition');

    const rangeSubmissions = await base
      .clone()
      .where('submission.createdAt BETWEEN :from AND :to', {
        from: from.toISOString(),
        to: to.toISOString(),
      })
      .getMany();

    const byStatus: Record<string, number> = {};
    const byForm: Record<string, number> = {};
    let last7Days = 0;
    let last30Days = 0;
    let suspicious = 0;

    for (const submission of rangeSubmissions) {
      byStatus[submission.status] = (byStatus[submission.status] ?? 0) + 1;
      byForm[submission.formDefinition.code] =
        (byForm[submission.formDefinition.code] ?? 0) + 1;
      const age = now - submission.createdAt.getTime();
      if (age <= 7 * 24 * 60 * 60 * 1000) last7Days += 1;
      if (age <= 30 * 24 * 60 * 60 * 1000) last30Days += 1;
      if (submission.isSuspicious) suspicious += 1;
    }

    return {
      total: rangeSubmissions.length,
      last7Days,
      last30Days,
      suspicious,
      byStatus,
      byForm,
    };
  }

  /** CSV export — the same filters as the list, unpaged (spec §5.1). */
  async exportSubmissionsCsv(filters: FindSubmissionsDto): Promise<string> {
    const { data } = await this.listSubmissions({
      ...filters,
      page: 1,
      pageSize: 100000,
    });

    const header = [
      'id',
      'formCode',
      'fullName',
      'email',
      'phone',
      'primaryFieldCode',
      'status',
      'createdAt',
    ];
    const escape = (value: unknown) => {
      const text = value === null || value === undefined ? '' : String(value);
      return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
    };

    const lines = [
      header.join(','),
      ...data.map((row) =>
        [
          row.id,
          row.formCode,
          row.fullName,
          row.email,
          row.phone,
          row.primaryFieldCode,
          row.status,
          row.createdAt,
        ]
          .map(escape)
          .join(','),
      ),
    ];

    // A leading BOM so Excel reads the Vietnamese diacritics as UTF-8.
    return `\uFEFF${lines.join('\n')}`;
  }

  // ───────────────────────────── internals ─────────────────────────────

  private async requireDefinition(code: string): Promise<FormDefinitionEntity> {
    const definition = await this.repository.findDefinitionByCode(code);
    if (!definition) {
      throw new NotFoundException({
        status: 404,
        error: 'form_definition_not_found',
      });
    }
    return definition;
  }

  /**
   * Pairs each question with its allowlist *resolved to names*: empty
   * allowlist → the whole active group (spec §2.2), otherwise the subset the
   * form chose. Two query groups at the end, always.
   */
  private async resolveQuestions(
    definition: FormDefinitionEntity,
    questions: FormQuestionEntity[],
  ): Promise<ResolvedQuestion[]> {
    const allowlists = await this.repository.findOptionsForQuestions(
      questions.map((question) => question.id),
    );
    const allowByQuestion = new Map<string, string[]>();
    for (const option of allowlists) {
      const list = allowByQuestion.get(option.question.id) ?? [];
      list.push(option.optionCode);
      allowByQuestion.set(option.question.id, list);
    }

    const groupKeys = [
      ...new Set(
        questions
          .map((question) => question.masterDataGroupKey)
          .filter((key): key is string => Boolean(key)),
      ),
    ];
    const locale = LocaleContext.current();
    const namesByGroup = new Map<
      string,
      { code: string; name: string; displayOrder: number }[]
    >();
    for (const groupKey of groupKeys) {
      const codes = await this.masterDataCodes.findAllWithPagination({
        filterOptions: { groupKey, isActive: true },
        paginationOptions: { page: 1, limit: 1000 },
      });
      namesByGroup.set(
        groupKey,
        codes.map((code) => ({
          code: code.code,
          name: pickLocalized(
            code.nameTranslations,
            locale,
            code.code,
          ) as string,
          displayOrder: code.displayOrder ?? 0,
        })),
      );
    }

    return questions.map((question) => {
      const all = question.masterDataGroupKey
        ? (namesByGroup.get(question.masterDataGroupKey) ?? [])
        : [];
      const allowed = allowByQuestion.get(question.id);
      const chosen = allowed
        ? allowed
            .map((code) => all.find((option) => option.code === code))
            .filter((option): option is (typeof all)[number] => Boolean(option))
        : all;
      const order = allowed ?? chosen.map((option) => option.code);

      return {
        entity: question,
        options: [...chosen].sort(
          (a, b) => order.indexOf(a.code) - order.indexOf(b.code),
        ),
      };
    });
  }

  private assembleDefinition(
    definition: FormDefinitionEntity,
    resolved: ResolvedQuestion[],
  ): FormDefinitionDto {
    const locale = LocaleContext.current();
    const byId = new Map(resolved.map((r) => [r.entity.id, r.entity]));
    const sections = new Map<string, FormSectionDto>();
    const sectionOrder: string[] = [];

    for (const { entity, options } of resolved) {
      if (!sections.has(entity.sectionCode)) {
        sections.set(entity.sectionCode, {
          code: entity.sectionCode,
          title: this.sectionTitle(entity.sectionCode, locale),
          questions: [],
        });
        sectionOrder.push(entity.sectionCode);
      }
      sections
        .get(entity.sectionCode)
        ?.questions.push(this.toQuestion(entity, options, byId, locale));
    }

    return {
      code: definition.code,
      name: pickLocalized(
        definition.nameTranslations,
        locale,
        definition.code,
      ) as string,
      description: definition.descriptionTranslations
        ? (pickLocalized(definition.descriptionTranslations, locale, null) as
            | string
            | null)
        : null,
      version: definition.version,
      // The questions arrived in authored order, so a section's first sighting
      // fixes its place; within a section, displayOrder decides.
      sections: sectionOrder.map((code) => {
        const section = sections.get(code) as FormSectionDto;
        section.questions.sort((a, b) => a.displayOrder - b.displayOrder);
        return section;
      }),
    };
  }

  private toQuestion(
    entity: FormQuestionEntity,
    options: { code: string; name: string }[],
    byId: Map<string, FormQuestionEntity>,
    locale: string,
  ): FormQuestionDto {
    const parentId = entity.parentQuestion?.id;
    // `parentQuestion` is loaded by relation; the code is what the client keys
    // on, so resolve it here rather than shipping the whole parent.
    const parentCode = parentId
      ? (byId.get(parentId)?.code ?? null)
      : (entity.parentQuestion?.code ?? null);

    return {
      code: entity.code,
      sectionCode: entity.sectionCode,
      type: entity.questionType,
      label: pickLocalized(
        entity.labelTranslations,
        locale,
        entity.code,
      ) as string,
      placeholder: pickLocalized(
        entity.placeholderTranslations,
        locale,
        null,
      ) as string | null,
      helper: pickLocalized(entity.helperTranslations, locale, null) as
        | string
        | null,
      isRequired: entity.isRequired,
      displayOrder: entity.displayOrder,
      minLength: entity.minLength,
      maxLength: entity.maxLength,
      allowOther: entity.allowOther,
      consentCode: entity.consentCode,
      parentQuestionCode: parentCode,
      parentOptionCode: entity.parentOptionCode,
      options: options.map<FormOptionDto>((option) => ({
        code: option.code,
        name: option.name,
      })),
    };
  }

  /**
   * Semantics, not shape. Everything the DTO cannot know: the code belongs to
   * this form, options are in this question's allowlist, a conditional is
   * actually unlocked, `other` carries its text, text obeys its bounds, and
   * the required consents were given.
   */
  private validateAnswers(
    inputs: FormAnswerInputDto[],
    byCode: Map<string, ResolvedQuestion>,
  ): Map<string, FormAnswerInputDto> {
    const errors: Record<string, string> = {};
    const answers = new Map<string, FormAnswerInputDto>();
    const seen = new Set<string>();

    for (const input of inputs) {
      const question = byCode.get(input.questionCode);
      if (!question) {
        errors[input.questionCode] = 'unknown_question';
        continue;
      }
      if (seen.has(input.questionCode)) {
        errors[input.questionCode] = 'duplicate_answer';
        continue;
      }
      seen.add(input.questionCode);

      if (!this.isUnlocked(question.entity, byCode, answers)) {
        errors[input.questionCode] = 'not_unlocked';
        continue;
      }

      const optionCodes = input.optionCodes ?? [];
      const allowedCodes = new Set(
        question.options.map((option) => option.code),
      );
      // `other` is always allowed when the question says so, even if the
      // allowlist resolver filtered it out of the group.
      if (question.entity.allowOther) allowedCodes.add('other');

      for (const optionCode of optionCodes) {
        if (!allowedCodes.has(optionCode)) {
          errors[input.questionCode] = 'invalid_option';
          break;
        }
      }

      const text = input.text?.trim() ?? '';
      if (question.entity.questionType === 'email' && text) {
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text)) {
          errors[input.questionCode] = 'invalid_email';
        }
      }
      if (
        ['long_text', 'short_text', 'url'].includes(
          question.entity.questionType,
        ) &&
        text
      ) {
        const min = question.entity.minLength ?? FORM_LONG_TEXT_MIN_DEFAULT;
        const max = question.entity.maxLength ?? FORM_LONG_TEXT_MAX_DEFAULT;
        if (text.length < min) errors[input.questionCode] = 'too_short';
        if (text.length > max) errors[input.questionCode] = 'too_long';
      }
      // Selecting `other` without its detail is exactly what the taxonomy
      // needs to learn from, so it is required (spec §4).
      if (
        question.entity.allowOther &&
        optionCodes.includes('other') &&
        !text
      ) {
        errors[input.questionCode] = 'other_text_required';
      }

      answers.set(input.questionCode, input);
    }

    for (const { entity } of byCode.values()) {
      if (entity.questionType === 'consent') continue;
      if (entity.isRequired && !answers.has(entity.code)) {
        errors[entity.code] = 'required';
      }
    }

    if (Object.keys(errors).length > 0) {
      throw new UnprocessableEntityException({
        status: 422,
        errors,
      });
    }

    return answers;
  }

  private isUnlocked(
    question: FormQuestionEntity,
    byCode: Map<string, ResolvedQuestion>,
    answers: Map<string, FormAnswerInputDto>,
  ): boolean {
    const parentCode = question.parentQuestion?.code;
    if (!question.parentOptionCode || !parentCode) return true;
    const parentAnswer = answers.get(parentCode);
    return Boolean(
      parentAnswer?.optionCodes?.includes(question.parentOptionCode),
    );
  }

  private validateConsents(
    consents: string[],
    resolved: ResolvedQuestion[],
  ): void {
    const required = resolved
      .filter(
        (r) =>
          r.entity.questionType === 'consent' &&
          r.entity.isRequired &&
          r.entity.consentCode,
      )
      .map((r) => r.entity.consentCode as string);
    const missing = required.filter((code) => !consents.includes(code));
    if (missing.length > 0) {
      throw new UnprocessableEntityException({
        status: 422,
        errors: { consents: 'required_consent_missing' },
      });
    }
  }

  private validateCourse(courseId?: string | null): void {
    if (!courseId) return;
    // A bad course id is a client bug, not a form answer; fail loudly rather
    // than writing a dangling FK.
    if (!/^[0-9a-f-]{36}$/i.test(courseId)) {
      throw new BadRequestException({
        status: 400,
        error: 'invalid_course_id',
      });
    }
  }

  private requiredText(
    answers: Map<string, FormAnswerInputDto>,
    code: string,
  ): string {
    const text = answers.get(code)?.text?.trim();
    if (!text) {
      throw new UnprocessableEntityException({
        status: 422,
        errors: { [code]: 'required' },
      });
    }
    return text;
  }

  private primaryField(
    answers: Map<string, FormAnswerInputDto>,
    resolved: ResolvedQuestion[],
  ): string | null {
    const single = resolved.find(
      (r) =>
        r.entity.code === 'profession' &&
        r.entity.questionType === 'single_select',
    );
    if (!single) return null;
    return answers.get('profession')?.optionCodes?.[0] ?? null;
  }

  private async persistAnswers(
    submission: FormSubmissionEntity,
    answers: Map<string, FormAnswerInputDto>,
    resolved: ResolvedQuestion[],
  ): Promise<void> {
    const byCode = new Map(resolved.map((r) => [r.entity.code, r]));
    const answerRows: Partial<FormAnswerEntity>[] = [];
    const optionRows: {
      questionId: string;
      optionCode: string;
      groupKey: string | null;
    }[] = [];

    for (const [code, input] of answers) {
      const question = byCode.get(code);
      if (!question || question.entity.questionType === 'consent') continue;

      answerRows.push({
        submission: { id: submission.id } as FormSubmissionEntity,
        question: { id: question.entity.id } as FormQuestionEntity,
        textValue: input.text?.trim() || null,
      });
      for (const optionCode of input.optionCodes ?? []) {
        optionRows.push({
          questionId: question.entity.id,
          optionCode,
          groupKey: question.entity.masterDataGroupKey ?? null,
        });
      }
    }

    const saved = await this.repository.saveAnswers(answerRows);
    const answerIdByQuestion = new Map(
      saved.map((row) => [row.question.id, row.id]),
    );

    await this.repository.saveAnswerOptions(
      optionRows.map((row) => ({
        answer: {
          id: answerIdByQuestion.get(row.questionId),
        } as FormAnswerEntity,
        question: { id: row.questionId } as FormQuestionEntity,
        submission: { id: submission.id } as FormSubmissionEntity,
        optionCode: row.optionCode,
        optionGroupKey: row.groupKey,
      })),
    );
  }

  private async persistConsents(
    submission: FormSubmissionEntity,
    consents: string[],
  ): Promise<void> {
    await this.repository.saveConsents(
      consents.map((consentCode) => ({
        submission: { id: submission.id } as FormSubmissionEntity,
        consentCode,
        version: FORM_CONSENT_VERSION,
      })),
    );
  }

  private toListItem(entity: FormSubmissionEntity): FormSubmissionListItemDto {
    return {
      id: entity.id,
      formCode: entity.formDefinition.code,
      fullName: entity.fullName,
      email: entity.email,
      phone: entity.phone,
      primaryFieldCode: entity.primaryFieldCode,
      status: entity.status,
      assignedToUserId: entity.assignedToUser?.id ?? null,
      isSuspicious: entity.isSuspicious,
      createdAt: entity.createdAt.toISOString(),
    };
  }

  private toAnswers(
    answerRows: FormAnswerEntity[],
    optionRows: { answer?: FormAnswerEntity; optionCode: string }[],
    byId: Map<string, FormQuestionEntity>,
    codeToName: Map<string, string>,
    locale: string,
  ): FormSubmissionAnswerDto[] {
    const optionsByAnswer = new Map<string, string[]>();
    for (const option of optionRows) {
      const answerId = option.answer?.id;
      if (!answerId) continue;
      const list = optionsByAnswer.get(answerId) ?? [];
      list.push(option.optionCode);
      optionsByAnswer.set(answerId, list);
    }

    return answerRows.map((row) => {
      const question = byId.get(row.question.id);
      const optionCodes = optionsByAnswer.get(row.id) ?? [];
      return {
        questionCode: row.question.code,
        questionType: question?.questionType ?? '',
        label: pickLocalized(
          question?.labelTranslations ?? {},
          locale,
          row.question.code,
        ) as string,
        text: row.textValue,
        optionCodes,
        // The codes are the analytics key; the names are what an operator
        // reads in the drawer. Resolved from the definition the answer
        // belongs to, so a later rename shows the current wording.
        optionNames: optionCodes.map(
          (code) => codeToName.get(`${row.question.code}:${code}`) ?? code,
        ),
      };
    });
  }

  private sortColumn(sort?: string): string {
    return ['createdAt', 'fullName', 'email', 'status'].includes(sort ?? '')
      ? (sort as string)
      : 'createdAt';
  }

  private sectionTitle(sectionCode: string, locale: string): string {
    // Section titles are structural, not content: they are the same three or
    // four words across every form, so they live here rather than in a column.
    const titles: Record<string, Record<string, string>> = {
      student_info: { vi: 'Thông tin của bạn', en: 'Your details' },
      learning_needs: { vi: 'Bạn quan tâm đến điều gì', en: 'What you need' },
      teaching: { vi: 'Việc giảng dạy', en: 'Teaching' },
      schedule: { vi: 'Thời gian học', en: 'Schedule' },
      goals: { vi: 'Mục tiêu của bạn', en: 'Your goals' },
      about_you: { vi: 'Về bạn', en: 'About you' },
      experiences_to_design: {
        vi: 'Kinh nghiệm bạn muốn chia sẻ',
        en: 'Experience to share',
      },
      consent: { vi: 'Đồng ý', en: 'Consent' },
    };
    return (
      titles[sectionCode]?.[locale] ?? titles[sectionCode]?.vi ?? sectionCode
    );
  }

  /** Spec §8: a filled honeypot or a sub-second fill marks, never blocks. */
  private screenSubmission(
    emailNormalized: string,
    dto: CreateFormSubmissionDto,
  ): boolean {
    const fillMs = Date.now() - (dto.startedAt || 0);
    if (dto._hp && dto._hp.trim() !== '') return true;
    if (fillMs >= 0 && fillMs < SUSPICIOUS_FILL_MS) return true;
    return SUSPICIOUS_EMAILS.test(emailNormalized);
  }

  /**
   * sha256 over a 2^32 space is reversible, so the IP is hashed with a
   * daily-rotating key and only the day it belonged to is kept (spec C11).
   */
  private hashIp(ip: string): string {
    const day = new Date().toISOString().slice(0, 10);
    const key = process.env.FORM_IP_HMAC_KEY ?? 'dna-forms';
    return createHmac('sha256', `${key}:${day}`)
      .update(ip)
      .digest('hex')
      .slice(0, 48);
  }

  /** Exposed for tests: deterministic email fingerprint. */
  static fingerprint(email: string): string {
    return createHash('sha256').update(email).digest('hex');
  }
}
