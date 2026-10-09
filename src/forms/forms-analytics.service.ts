import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import type { ObjectLiteral, SelectQueryBuilder } from 'typeorm';
import { FormSubmissionConsentEntity } from '../form-submission-consent/infrastructure/persistence/relational/entities/form-submission-consent.entity';
import { FormSubmissionEntity } from '../form-submission/infrastructure/persistence/relational/entities/form-submission.entity';
import { FormAnswerOptionEntity } from '../form-answer-option/infrastructure/persistence/relational/entities/form-answer-option.entity';
import { FormQuestionEntity } from '../form-question/infrastructure/persistence/relational/entities/form-question.entity';
import { MasterDataCodesService } from '../master-data-codes/master-data-codes.service';
import { LocaleContext } from '../utils/i18n/locale-context';
import { pickLocalized } from '../utils/i18n/pick-localized';
import { FormsRepository } from './infrastructure/persistence/relational/forms.repository';
import { FormsService } from './forms.service';
import {
  ANALYTICS_STATUS_ORDER,
  AnalyticsBucket,
  AnalyticsCrosstabDto,
  AnalyticsQuestionsDto,
  AnalyticsRespondentsDto,
  AnalyticsSummaryDto,
  AnalyticsSupplyDemandDto,
  AnalyticsTextsDto,
  AnalyticsTimeseriesDto,
  FindAnalyticsDto,
  FindCrosstabDto,
  FindFormAnalyticsDto,
  FindRespondentsDto,
  FindTextsDto,
  SetAnswerThemeResponseDto,
} from './dto/form-analytics.dto';

const DAY_MS = 24 * 60 * 60 * 1000;
/** Vietnam has no DST, so a fixed offset is exact, not an approximation. */
const TZ_OFFSET = '+07:00';
const MAX_RANGE_DAYS = 731;
/** 90 days inclusive: `from = to - 89`. */
const DEFAULT_RANGE_DAYS = 90;
const CONTACT_CONSENT = 'contact';

type Range = {
  from: string;
  to: string;
  prevFrom: string;
  prevTo: string;
  fromTs: Date;
  toTsExclusive: Date;
  prevFromTs: Date;
  prevToTsExclusive: Date;
};

type ScopeOptions = {
  alias?: string;
  defAlias?: string;
  ignoreDrill?: boolean;
};

/**
 * The forms analytics API (PLAN-forms-insights). Every number is a server-side
 * `GROUP BY` / `COUNT` over the scope defined in §1.4 — raw submissions never
 * leave the server, and no analytics response carries PII.
 *
 * `applyScope` is the single definition of "which submissions count", so every
 * endpoint answers the same question with the same filters. `resolveRange`
 * turns the calendar-day query params into the instants the SQL compares
 * against, once, so no endpoint re-derives the timezone rules.
 */
@Injectable()
export class FormsAnalyticsService {
  constructor(
    private readonly repository: FormsRepository,
    private readonly formsService: FormsService,
    private readonly masterDataCodes: MasterDataCodesService,
  ) {}

  // ───────────────────────────── range ─────────────────────────────

  private startOfLocalDay(date: string): Date {
    return new Date(`${date}T00:00:00${TZ_OFFSET}`);
  }

  /** The Vietnam calendar date a given instant falls on. */
  private localDateOf(date: Date): string {
    return new Date(date.getTime() + 7 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
  }

  /**
   * Calendar-day query params → the instants the scope compares against, plus
   * the previous window of equal length. `from` inclusive at local 00:00, `to`
   * inclusive through local end of day (`toTsExclusive` = next local 00:00).
   */
  resolveRange(dto: FindAnalyticsDto): Range {
    // A drill is a pair: half of it is a client bug, not a wider query.
    if (Boolean(dto.fq) !== Boolean(dto.fo)) {
      throw new UnprocessableEntityException({
        status: 422,
        errors: { drill: 'analytics_drill_incomplete' },
      });
    }

    const to = dto.to ?? this.localDateOf(new Date());
    const from =
      dto.from ??
      this.localDateOf(
        new Date(
          this.startOfLocalDay(to).getTime() -
            (DEFAULT_RANGE_DAYS - 1) * DAY_MS,
        ),
      );

    const fromTs = this.startOfLocalDay(from);
    const toTsExclusive = new Date(this.startOfLocalDay(to).getTime() + DAY_MS);
    const lengthMs = toTsExclusive.getTime() - fromTs.getTime();

    if (lengthMs <= 0) {
      throw new UnprocessableEntityException({
        status: 422,
        errors: { range: 'analytics_range_invalid' },
      });
    }
    if (lengthMs > MAX_RANGE_DAYS * DAY_MS) {
      throw new UnprocessableEntityException({
        status: 422,
        errors: { range: 'analytics_range_too_large' },
      });
    }

    const prevFromTs = new Date(fromTs.getTime() - lengthMs);
    return {
      from,
      to,
      prevFrom: this.localDateOf(prevFromTs),
      prevTo: this.localDateOf(new Date(fromTs.getTime() - DAY_MS)),
      fromTs,
      toTsExclusive,
      prevFromTs,
      prevToTsExclusive: fromTs,
    };
  }

  // ───────────────────────────── scope ─────────────────────────────

  /**
   * The one definition of the counted set (§1.4). Joins the definition once and
   * applies: latest, not archived, in range, suspicious per the flag, and the
   * source / locale / form / drill filters.
   */
  applyScope<T extends ObjectLiteral>(
    qb: SelectQueryBuilder<T>,
    range: Range,
    filters: FindAnalyticsDto & { formCode?: string },
    options: ScopeOptions = {},
  ): SelectQueryBuilder<T> {
    const alias = options.alias ?? 'submission';
    const defAlias = options.defAlias ?? 'definition';

    qb.leftJoin(`${alias}.formDefinition`, defAlias);
    qb.andWhere(`${alias}.isLatest = true`);
    qb.andWhere(`${alias}.status <> :archived`, { archived: 'archived' });
    qb.andWhere(
      `${alias}.createdAt >= :fromTs AND ${alias}.createdAt < :toTsExclusive`,
      { fromTs: range.fromTs, toTsExclusive: range.toTsExclusive },
    );
    if (!filters.includeSuspicious) {
      qb.andWhere(`${alias}.isSuspicious = false`);
    }
    if (filters.source) {
      qb.andWhere(`${alias}.source = :source`, { source: filters.source });
    }
    if (filters.locale) {
      qb.andWhere(`${alias}.locale = :locale`, { locale: filters.locale });
    }
    if (filters.formCode) {
      qb.andWhere(`${defAlias}.code = :formCode`, {
        formCode: filters.formCode,
      });
    }
    if (!options.ignoreDrill && filters.fq && filters.fo) {
      qb.andWhere(
        `EXISTS (SELECT 1 FROM form_answer_option fao ` +
          `JOIN form_question fq2 ON fq2.id = fao.question_id ` +
          `WHERE fao.submission_id = ${alias}.id ` +
          `AND fq2.code = :fq AND fao.option_code = :fo)`,
        { fq: filters.fq, fo: filters.fo },
      );
    }

    return qb;
  }

  // ───────────────────────────── summary ─────────────────────────────

  async getSummary(dto: FindAnalyticsDto): Promise<AnalyticsSummaryDto> {
    const range = this.resolveRange(dto);
    const locale = LocaleContext.current();

    const definitions = (await this.repository.findDefinitions()).filter(
      (definition) => definition.isActive,
    );

    // The previous window is the same scope with shifted instants.
    const previousRange: Range = {
      ...range,
      fromTs: range.prevFromTs,
      toTsExclusive: range.prevToTsExclusive,
    };

    const [current, previous, consent, bySource, byStatus, suspiciousCount] =
      await Promise.all([
        this.applyScope(
          this.repository.submissionsRepo.createQueryBuilder('submission'),
          range,
          dto,
        )
          .select('definition.code', 'formCode')
          .addSelect('COUNT(*)', 'total')
          .addSelect(
            `COUNT(*) FILTER (WHERE submission.status = 'new')`,
            'newCount',
          )
          .groupBy('definition.code')
          .getRawMany<{ formCode: string; total: string; newCount: string }>(),

        this.applyScope(
          this.repository.submissionsRepo.createQueryBuilder('submission'),
          previousRange,
          dto,
        )
          .select('definition.code', 'formCode')
          .addSelect('COUNT(*)', 'total')
          .groupBy('definition.code')
          .getRawMany<{ formCode: string; total: string }>(),

        this.applyScope(
          this.repository.submissionsRepo.createQueryBuilder('submission'),
          range,
          dto,
        )
          .leftJoin(
            FormSubmissionConsentEntity,
            'consent',
            'consent.submission_id = submission.id AND consent.consent_code = :contact',
            { contact: CONTACT_CONSENT },
          )
          .select('definition.code', 'formCode')
          .addSelect(
            'COUNT(DISTINCT submission.id) FILTER (WHERE consent.id IS NOT NULL)',
            'withConsent',
          )
          .groupBy('definition.code')
          .getRawMany<{ formCode: string; withConsent: string }>(),

        this.applyScope(
          this.repository.submissionsRepo.createQueryBuilder('submission'),
          range,
          dto,
        )
          .select('submission.source', 'source')
          .addSelect('COUNT(*)', 'count')
          .groupBy('submission.source')
          .orderBy('count', 'DESC')
          .getRawMany<{ source: string; count: string }>(),

        this.applyScope(
          this.repository.submissionsRepo.createQueryBuilder('submission'),
          range,
          dto,
        )
          .select('submission.status', 'status')
          .addSelect('COUNT(*)', 'count')
          .groupBy('submission.status')
          .getRawMany<{ status: string; count: string }>(),

        // Counted regardless of the flag: the card shows how many are hidden.
        this.applyScope(
          this.repository.submissionsRepo.createQueryBuilder('submission'),
          range,
          { ...dto, includeSuspicious: true },
        )
          .andWhere('submission.isSuspicious = true')
          .getCount(),
      ]);

    const currentByCode = new Map(current.map((row) => [row.formCode, row]));
    const previousByCode = new Map(previous.map((row) => [row.formCode, row]));
    const consentByCode = new Map(consent.map((row) => [row.formCode, row]));

    const forms = definitions.map((definition) => {
      const total = Number(currentByCode.get(definition.code)?.total ?? 0);
      const withConsent = Number(
        consentByCode.get(definition.code)?.withConsent ?? 0,
      );
      return {
        formCode: definition.code,
        formName: pickLocalized(
          definition.nameTranslations,
          locale,
          definition.code,
        ) as string,
        total,
        previousTotal: Number(previousByCode.get(definition.code)?.total ?? 0),
        newCount: Number(currentByCode.get(definition.code)?.newCount ?? 0),
        contactConsentRate: total > 0 ? withConsent / total : 0,
      };
    });

    const statusCounts = new Map(
      byStatus.map((row) => [row.status, Number(row.count)]),
    );

    return {
      range: { from: range.from, to: range.to },
      previousRange: { from: range.prevFrom, to: range.prevTo },
      forms,
      bySource: bySource.map((row) => ({
        source: row.source,
        count: Number(row.count),
      })),
      // Pipeline order, zero-filled, so the chart never reorders itself.
      byStatus: ANALYTICS_STATUS_ORDER.map((status) => ({
        status,
        count: statusCounts.get(status) ?? 0,
      })),
      suspiciousCount,
    };
  }

  // ───────────────────────────── timeseries ─────────────────────────────

  /**
   * The bucket start dates a range covers, in local calendar days. Must match
   * Postgres `date_trunc(bucket, ts AT TIME ZONE 'Asia/Ho_Chi_Minh')`: days are
   * the days themselves, weeks start on the Monday on or before `from`, months
   * on the first of the month.
   */
  private bucketStarts(
    from: string,
    to: string,
    bucket: AnalyticsBucket,
  ): string[] {
    const toTs = this.startOfLocalDay(to).getTime();

    if (bucket === 'day') {
      const starts: string[] = [];
      for (
        let t = this.startOfLocalDay(from).getTime();
        t <= toTs;
        t += DAY_MS
      ) {
        starts.push(this.localDateOf(new Date(t)));
      }
      return starts;
    }

    if (bucket === 'week') {
      // Postgres weeks start Monday. Noon UTC+7 lands on the same UTC day, so
      // `getUTCDay` reads the local weekday without a second conversion.
      const weekday = new Date(`${from}T12:00:00${TZ_OFFSET}`).getUTCDay();
      const daysFromMonday = (weekday + 6) % 7;
      const starts: string[] = [];
      for (
        let t = this.startOfLocalDay(from).getTime() - daysFromMonday * DAY_MS;
        t <= toTs;
        t += 7 * DAY_MS
      ) {
        starts.push(this.localDateOf(new Date(t)));
      }
      return starts;
    }

    const starts: string[] = [];
    let [year, month] = from.slice(0, 7).split('-').map(Number);
    while (
      this.startOfLocalDay(
        `${year}-${String(month).padStart(2, '0')}-01`,
      ).getTime() <= toTs
    ) {
      starts.push(`${year}-${String(month).padStart(2, '0')}-01`);
      if (month === 12) {
        year += 1;
        month = 1;
      } else {
        month += 1;
      }
    }
    return starts;
  }

  async getTimeseries(dto: FindAnalyticsDto): Promise<AnalyticsTimeseriesDto> {
    const range = this.resolveRange(dto);
    const days = Math.round(
      (range.toTsExclusive.getTime() - range.fromTs.getTime()) / DAY_MS,
    );
    const bucket: AnalyticsBucket =
      days <= 31 ? 'day' : days <= 180 ? 'week' : 'month';

    const bucketExpr = `date_trunc('${bucket}', submission.createdAt AT TIME ZONE 'Asia/Ho_Chi_Minh')`;

    const [rows, definitions] = await Promise.all([
      this.applyScope(
        this.repository.submissionsRepo.createQueryBuilder('submission'),
        range,
        dto,
      )
        .select(`to_char(${bucketExpr}, 'YYYY-MM-DD')`, 'bucket')
        .addSelect('definition.code', 'formCode')
        .addSelect('COUNT(*)', 'count')
        .groupBy(bucketExpr)
        .addGroupBy('definition.code')
        .getRawMany<{ bucket: string; formCode: string; count: string }>(),

      this.repository.findDefinitions(),
    ]);

    const formCodes = definitions
      .filter((definition) => definition.isActive)
      .map((definition) => definition.code);

    const byBucket = new Map<string, Map<string, number>>();
    for (const row of rows) {
      const counts = byBucket.get(row.bucket) ?? new Map<string, number>();
      counts.set(row.formCode, Number(row.count));
      byBucket.set(row.bucket, counts);
    }

    // Zero-filled: every bucket present, every active form present in each.
    return {
      bucket,
      points: this.bucketStarts(range.from, range.to, bucket).map((start) => ({
        start,
        byForm: Object.fromEntries(
          formCodes.map((code) => [code, byBucket.get(start)?.get(code) ?? 0]),
        ),
      })),
    };
  }

  // ───────────────────────────── questions ─────────────────────────────

  private async answeredCounts(
    range: Range,
    dto: FindFormAnalyticsDto,
    ignoreDrill: boolean,
  ): Promise<Map<string, number>> {
    const qb = this.repository.answersRepo
      .createQueryBuilder('answer')
      .innerJoin('answer.submission', 'submission')
      .innerJoin('answer.question', 'question');
    this.applyScope(qb, range, dto, { ignoreDrill });

    const rows = await qb
      .select('question.code', 'questionCode')
      .addSelect('COUNT(DISTINCT submission.id)', 'answered')
      .groupBy('question.code')
      .getRawMany<{ questionCode: string; answered: string }>();

    return new Map(rows.map((row) => [row.questionCode, Number(row.answered)]));
  }

  private async optionCounts(
    range: Range,
    dto: FindFormAnalyticsDto,
    ignoreDrill: boolean,
  ): Promise<Map<string, Map<string, number>>> {
    const qb = this.repository.answerOptionsRepo
      .createQueryBuilder('option')
      .innerJoin('option.submission', 'submission')
      .innerJoin('option.question', 'question');
    this.applyScope(qb, range, dto, { ignoreDrill });

    const rows = await qb
      .select('question.code', 'questionCode')
      .addSelect('option.optionCode', 'optionCode')
      .addSelect('COUNT(DISTINCT submission.id)', 'count')
      .groupBy('question.code')
      .addGroupBy('option.optionCode')
      .getRawMany<{
        questionCode: string;
        optionCode: string;
        count: string;
      }>();

    const byQuestion = new Map<string, Map<string, number>>();
    for (const row of rows) {
      const counts =
        byQuestion.get(row.questionCode) ?? new Map<string, number>();
      counts.set(row.optionCode, Number(row.count));
      byQuestion.set(row.questionCode, counts);
    }
    return byQuestion;
  }

  async getQuestions(
    dto: FindFormAnalyticsDto,
  ): Promise<AnalyticsQuestionsDto> {
    const range = this.resolveRange(dto);
    // Unknown or inactive code → the same 404 `form_definition_not_found` the
    // public definition route throws.
    const definition = await this.formsService.getPublicDefinition(
      dto.formCode,
    );
    const questions = definition.sections
      .flatMap((section) => section.questions)
      .filter(
        (question) =>
          question.type === 'single_select' || question.type === 'multi_select',
      );

    const [respondents, answeredWith, answeredNo, optionsWith, optionsNo] =
      await Promise.all([
        this.applyScope(
          this.repository.submissionsRepo.createQueryBuilder('submission'),
          range,
          dto,
        ).getCount(),
        this.answeredCounts(range, dto, false),
        this.answeredCounts(range, dto, true),
        this.optionCounts(range, dto, false),
        this.optionCounts(range, dto, true),
      ]);

    return {
      formCode: definition.code,
      respondents,
      questions: questions.map((question) => {
        // The drill question keeps its full distribution, so the client can
        // dim the non-selected bars instead of collapsing the card to 100%.
        const isDrillQuestion = dto.fq === question.code;
        const answered =
          (isDrillQuestion ? answeredNo : answeredWith).get(question.code) ?? 0;
        const counts =
          (isDrillQuestion ? optionsNo : optionsWith).get(question.code) ??
          new Map<string, number>();

        const options = question.options.map((option) => ({
          code: option.code,
          name: option.name,
          count: counts.get(option.code) ?? 0,
        }));
        // A code that was allowlisted when the answer was written but has since
        // been removed: keep the number, label it by code.
        const known = new Set(options.map((option) => option.code));
        for (const [code, count] of counts) {
          if (!known.has(code)) options.push({ code, name: code, count });
        }

        return {
          code: question.code,
          label: question.label,
          type: question.type as 'single_select' | 'multi_select',
          sectionCode: question.sectionCode,
          answered,
          parentQuestionCode: question.parentQuestionCode ?? null,
          parentOptionCode: question.parentOptionCode ?? null,
          options,
        };
      }),
    };
  }

  // ───────────────────────────── crosstab ─────────────────────────────

  /**
   * Two select questions crossed: how many submissions chose each
   * (row option, column option) pair. Drill-blind — the crosstab is a
   * form-level view, and a drill would empty most cells.
   */
  async getCrosstab(dto: FindCrosstabDto): Promise<AnalyticsCrosstabDto> {
    const range = this.resolveRange(dto);
    const definition = await this.formsService.getPublicDefinition(
      dto.formCode,
    );
    const selects = new Map(
      definition.sections
        .flatMap((section) => section.questions)
        .filter(
          (question) =>
            question.type === 'single_select' ||
            question.type === 'multi_select',
        )
        .map((question) => [question.code, question]),
    );
    const rowQuestion = selects.get(dto.row);
    const colQuestion = selects.get(dto.col);

    if (!rowQuestion || !colQuestion || dto.row === dto.col) {
      throw new UnprocessableEntityException({
        status: 422,
        errors: { crosstab: 'analytics_invalid_crosstab' },
      });
    }

    const base = () => {
      const qb = this.repository.answerOptionsRepo
        .createQueryBuilder('r')
        .innerJoin('r.submission', 'submission')
        .innerJoin('r.question', 'rq')
        .innerJoin(
          FormAnswerOptionEntity,
          'c',
          'c.submission_id = r.submission_id',
        )
        .innerJoin(FormQuestionEntity, 'cq', 'cq.id = c.question_id');
      this.applyScope(qb, range, dto, { ignoreDrill: true });
      qb.andWhere('rq.code = :row', { row: dto.row }).andWhere(
        'cq.code = :col',
        { col: dto.col },
      );
      return qb;
    };

    const [rows, respondentRow] = await Promise.all([
      base()
        .select('r.optionCode', 'rowCode')
        .addSelect('c.optionCode', 'colCode')
        .addSelect('COUNT(DISTINCT r.submission_id)', 'count')
        .groupBy('r.optionCode')
        .addGroupBy('c.optionCode')
        .getRawMany<{ rowCode: string; colCode: string; count: string }>(),
      base()
        .select('COUNT(DISTINCT r.submission_id)', 'n')
        .getRawOne<{ n: string }>(),
    ]);

    const rowOptions = rowQuestion.options.map((option) => ({
      code: option.code,
      name: option.name,
    }));
    const colOptions = colQuestion.options.map((option) => ({
      code: option.code,
      name: option.name,
    }));
    const rowIndex = new Map(
      rowOptions.map((option, index) => [option.code, index]),
    );
    const colIndex = new Map(
      colOptions.map((option, index) => [option.code, index]),
    );

    const cells = rowOptions.map(() => colOptions.map(() => 0));
    for (const row of rows) {
      const i = rowIndex.get(row.rowCode);
      const j = colIndex.get(row.colCode);
      // A code no longer in the allowlist keeps its number out of the matrix
      // rather than inventing a column with no label.
      if (i === undefined || j === undefined) continue;
      cells[i][j] += Number(row.count);
    }

    return {
      row: {
        code: rowQuestion.code,
        label: rowQuestion.label,
        options: rowOptions,
      },
      col: {
        code: colQuestion.code,
        label: colQuestion.label,
        options: colOptions,
      },
      cells,
      respondents: Number(respondentRow?.n ?? 0),
    };
  }

  // ───────────────────────── supply / demand ─────────────────────────

  /**
   * The learner forms say which field the audience wants; the instructor form
   * says which field they can teach. Same question code, same
   * `expertise_area` allowlist, so a field with demand and no supply is a gap.
   * Drill-blind on purpose: a learner drill must not hide the instructor side.
   */
  async getSupplyDemand(
    dto: FindAnalyticsDto,
  ): Promise<AnalyticsSupplyDemandDto> {
    const range = this.resolveRange(dto);
    const learnerForms = ['free_course_waitlist', 'advanced_course_interest'];

    const qb = this.repository.answerOptionsRepo
      .createQueryBuilder('option')
      .innerJoin('option.submission', 'submission')
      .innerJoin('option.question', 'question');
    // `applyScope` joins `submission.formDefinition` as `definition`.
    this.applyScope(qb, range, dto, { ignoreDrill: true });
    qb.andWhere('question.code = :fieldQuestion', {
      fieldQuestion: 'profession',
    });

    const rows = await qb
      .select('option.optionCode', 'code')
      .addSelect('definition.code', 'formCode')
      .addSelect('COUNT(DISTINCT submission.id)', 'count')
      .groupBy('option.optionCode')
      .addGroupBy('definition.code')
      .getRawMany<{ code: string; formCode: string; count: string }>();

    const learner = new Set(learnerForms);
    const totals = new Map<string, { demand: number; supply: number }>();
    const bump = (code: string, key: 'demand' | 'supply', by: number) => {
      const entry = totals.get(code) ?? { demand: 0, supply: 0 };
      entry[key] += by;
      totals.set(code, entry);
    };
    for (const row of rows) {
      const count = Number(row.count);
      if (learner.has(row.formCode)) bump(row.code, 'demand', count);
      else if (row.formCode === 'instructor_application')
        bump(row.code, 'supply', count);
    }

    const locale = LocaleContext.current();
    const options = await this.masterDataCodes.findAllWithPagination({
      filterOptions: { groupKey: 'expertise_area' },
      paginationOptions: { page: 1, limit: 1000 },
    });
    const labels = new Map(
      options.map((option) => [
        option.code,
        pickLocalized(option.nameTranslations, locale, option.name) as string,
      ]),
    );

    // Every field in the group is listed, so a field with demand and no supply
    // shows an explicit gap. A code no longer in the group (a retired option
    // still referenced by old answers) keeps its raw code.
    const codes = new Set<string>(labels.keys());
    for (const code of totals.keys()) codes.add(code);

    const result = [...codes].map((code) => ({
      code,
      name: labels.get(code) ?? code,
      demand: totals.get(code)?.demand ?? 0,
      supply: totals.get(code)?.supply ?? 0,
    }));
    result.sort((a, b) => b.demand - a.demand || a.name.localeCompare(b.name));

    return { rows: result };
  }

  // ─────────────────── free-text feed and themes ───────────────────

  /** Which question's free text can carry which theme group. */
  private static readonly THEME_GROUP_BY_QUESTION: Record<string, string> = {
    biggest_challenge: 'form_theme_biggest_challenge',
    experiences_to_design: 'form_theme_experiences_to_design',
  };

  private themeGroupFor(questionCode: string): string | null {
    return FormsAnalyticsService.THEME_GROUP_BY_QUESTION[questionCode] ?? null;
  }

  async getTexts(dto: FindTextsDto): Promise<AnalyticsTextsDto> {
    const range = this.resolveRange(dto);
    const definition = await this.formsService.getPublicDefinition(
      dto.formCode,
    );
    const question = definition.sections
      .flatMap((section) => section.questions)
      .find((item) => item.code === dto.questionCode);
    const groupKey = this.themeGroupFor(dto.questionCode);
    if (!question || !groupKey || question.type !== 'long_text') {
      throw new UnprocessableEntityException({
        status: 422,
        errors: { question: 'analytics_invalid_text_question' },
      });
    }

    const page = dto.page ?? 1;
    const limit = dto.limit ?? 20;
    const locale = LocaleContext.current();

    // The scope + the text-is-not-blank rule + the search, shared by the
    // theme counts and the page.
    const scoped = () => {
      const qb = this.repository.answersRepo
        .createQueryBuilder('answer')
        .innerJoin('answer.submission', 'submission')
        .innerJoin('answer.question', 'question');
      this.applyScope(qb, range, dto, {});
      qb.andWhere('question.code = :questionCode', {
        questionCode: dto.questionCode,
      });
      qb.andWhere(
        'answer.textValue IS NOT NULL AND btrim(answer.textValue) <> :blank',
        { blank: '' },
      );
      if (dto.q) {
        qb.andWhere('answer.textValue ILIKE :pattern', {
          pattern: `%${escapeLike(dto.q)}%`,
        });
      }
      return qb;
    };

    // Theme counts ignore the theme filter (so the chips stay stable while one
    // is selected) but honour the search.
    const themeRows = await scoped()
      .select('answer.themeCode', 'themeCode')
      .addSelect('COUNT(DISTINCT submission.id)', 'count')
      .groupBy('answer.themeCode')
      .getRawMany<{ themeCode: string | null; count: string }>();
    const countByTheme = new Map(
      themeRows.map((row) => [row.themeCode, Number(row.count)]),
    );

    const themeCodes = await this.masterDataCodes.findAllWithPagination({
      filterOptions: { groupKey, isActive: true },
      paginationOptions: { page: 1, limit: 1000 },
    });
    const themes = themeCodes.map((code) => ({
      code: code.code,
      name: pickLocalized(code.nameTranslations, locale, code.name) as string,
      count: countByTheme.get(code.code) ?? 0,
    }));
    themes.push({
      code: 'untagged',
      name: locale === 'en' ? 'Untagged' : 'Chưa gắn',
      count: countByTheme.get(null) ?? 0,
    });

    const filtered = () => {
      const qb = scoped();
      if (dto.theme === 'untagged') {
        qb.andWhere('answer.themeCode IS NULL');
      } else if (dto.theme) {
        qb.andWhere('answer.themeCode = :theme', { theme: dto.theme });
      }
      return qb;
    };

    const [totalRow, items] = await Promise.all([
      filtered()
        .select('COUNT(DISTINCT submission.id)', 'n')
        .getRawOne<{ n: string }>(),
      filtered()
        .select('answer.id', 'answerId')
        .addSelect('submission.id', 'submissionId')
        .addSelect('answer.textValue', 'text')
        .addSelect('answer.themeCode', 'themeCode')
        .addSelect('answer.themeSource', 'themeSource')
        .addSelect('answer.createdAt', 'createdAt')
        .addSelect('submission.source', 'source')
        .orderBy('answer.createdAt', 'DESC')
        .offset((page - 1) * limit)
        .limit(limit)
        .getRawMany<{
          answerId: string;
          submissionId: string;
          text: string;
          themeCode: string | null;
          themeSource: string | null;
          createdAt: Date;
          source: string;
        }>(),
    ]);

    // profession names for just the rows on this page (G5: no PII).
    const submissionIds = items.map((item) => item.submissionId);
    const professionBySubmission = await this.professionsFor(
      submissionIds,
      locale,
    );

    const data = items.map((item) => ({
      answerId: item.answerId,
      submissionId: item.submissionId,
      text: item.text,
      themeCode: item.themeCode,
      themeSource: item.themeSource,
      createdAt: new Date(item.createdAt).toISOString(),
      source: item.source,
      professionNames: professionBySubmission.get(item.submissionId) ?? [],
    }));

    const totalWithText = Number(totalRow?.n ?? 0);
    return {
      question: { code: question.code, label: question.label },
      themes,
      totalWithText,
      data,
      page,
      limit,
      hasNextPage: page * limit < totalWithText,
    };
  }

  private async professionsFor(
    submissionIds: string[],
    locale: string,
  ): Promise<Map<string, string[]>> {
    const result = new Map<string, string[]>();
    if (submissionIds.length === 0) return result;

    const rows = await this.repository.answerOptionsRepo
      .createQueryBuilder('option')
      .innerJoin('option.submission', 'submission')
      .innerJoin('option.question', 'question')
      .where('submission.id IN (:...ids)', { ids: submissionIds })
      .andWhere('question.code = :profession', { profession: 'profession' })
      .select('submission.id', 'submissionId')
      .addSelect('option.optionCode', 'optionCode')
      .getRawMany<{ submissionId: string; optionCode: string }>();

    const expertise = await this.masterDataCodes.findAllWithPagination({
      filterOptions: { groupKey: 'expertise_area', isActive: true },
      paginationOptions: { page: 1, limit: 1000 },
    });
    const nameByCode = new Map(
      expertise.map((code) => [
        code.code,
        pickLocalized(code.nameTranslations, locale, code.name) as string,
      ]),
    );

    for (const row of rows) {
      const list = result.get(row.submissionId) ?? [];
      list.push(nameByCode.get(row.optionCode) ?? row.optionCode);
      result.set(row.submissionId, list);
    }
    return result;
  }

  async setTheme(
    answerId: string,
    themeCode: string | null,
    userId: number,
  ): Promise<SetAnswerThemeResponseDto> {
    const answer = await this.repository.answersRepo.findOne({
      where: { id: answerId },
      relations: ['question', 'submission'],
    });
    if (!answer) {
      throw new NotFoundException({
        status: 404,
        errors: { answer: 'answer_not_found' },
      });
    }

    const groupKey = this.themeGroupFor(answer.question.code);
    if (!groupKey) {
      throw new UnprocessableEntityException({
        status: 422,
        errors: { question: 'question_has_no_themes' },
      });
    }

    if (themeCode !== null) {
      const codes = await this.masterDataCodes.findAllWithPagination({
        filterOptions: { groupKey, isActive: true },
        paginationOptions: { page: 1, limit: 1000 },
      });
      if (!codes.some((code) => code.code === themeCode)) {
        throw new UnprocessableEntityException({
          status: 422,
          errors: { theme: 'theme_not_allowed' },
        });
      }
    }

    const themedAt = themeCode === null ? null : new Date();
    answer.themeCode = themeCode;
    answer.themeSource = themeCode === null ? null : 'manual';
    answer.themedAt = themedAt;
    await this.repository.answersRepo.save(answer);

    await this.repository.saveEvent({
      submission: { id: answer.submission.id } as FormSubmissionEntity,
      event: 'answer_themed',
      actorUser: { id: userId } as never,
      payload: { answerId, themeCode },
    });

    return {
      answerId,
      themeCode,
      themeSource: answer.themeSource,
      themedAt: (themedAt ?? new Date()).toISOString(),
    };
  }

  // ─────────────── respondents (the KPI tiles' drill-down) ───────────────

  /**
   * The people behind a form tab's KPI tiles, paged. Each metric windows the
   * submissions the tile counted: `all` is the scoped respondents, `consent`
   * those with the `contact` consent, `new` those still unreviewed. This is a
   * PII surface, like the dashboard's student drawer, and is bounded by
   * `limit` (max 100) so a form with thousands of rows never ships in one go.
   */
  async getRespondents(
    dto: FindRespondentsDto,
  ): Promise<AnalyticsRespondentsDto> {
    const range = this.resolveRange(dto);
    const metric = dto.metric ?? 'all';
    const page = dto.page ?? 1;
    const limit = dto.limit ?? 20;

    const base = () => {
      const qb =
        this.repository.submissionsRepo.createQueryBuilder('submission');
      this.applyScope(qb, range, dto);
      if (metric === 'new') {
        qb.andWhere('submission.status = :newStatus', { newStatus: 'new' });
      }
      if (metric === 'consent') {
        qb.innerJoin(
          FormSubmissionConsentEntity,
          'consent',
          'consent.submission_id = submission.id AND consent.consent_code = :contact',
          { contact: 'contact' },
        );
      }
      return qb;
    };

    const [rows, totalRow] = await Promise.all([
      base()
        .select('submission.id', 'submissionId')
        .addSelect('submission.fullName', 'fullName')
        .addSelect('submission.email', 'email')
        .addSelect('submission.phone', 'phone')
        .addSelect('submission.status', 'status')
        .addSelect('submission.source', 'source')
        .addSelect('submission.createdAt', 'createdAt')
        .orderBy('submission.createdAt', 'DESC')
        .offset((page - 1) * limit)
        .limit(limit)
        .getRawMany<{
          submissionId: string;
          fullName: string | null;
          email: string | null;
          phone: string | null;
          status: string;
          source: string;
          createdAt: Date;
        }>(),
      base()
        .select('COUNT(DISTINCT submission.id)', 'n')
        .getRawOne<{ n: string }>(),
    ]);

    const professionBySubmission = await this.professionsFor(
      rows.map((row) => row.submissionId),
      LocaleContext.current(),
    );

    const total = Number(totalRow?.n ?? 0);
    return {
      data: rows.map((row) => ({
        submissionId: row.submissionId,
        fullName: row.fullName,
        email: row.email,
        phone: row.phone,
        status: row.status,
        source: row.source,
        createdAt: new Date(row.createdAt).toISOString(),
        professionNames: professionBySubmission.get(row.submissionId) ?? [],
      })),
      total,
      page,
      limit,
      hasNextPage: page * limit < total,
    };
  }
}

/** Escape the LIKE metacharacters so a literal `%` or `_` in a search term is
 *  matched, not treated as a wildcard. */
function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`);
}
