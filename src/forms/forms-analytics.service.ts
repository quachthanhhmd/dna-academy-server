import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import type { SelectQueryBuilder } from 'typeorm';
import { FormSubmissionEntity } from '../form-submission/infrastructure/persistence/relational/entities/form-submission.entity';
import { FormSubmissionConsentEntity } from '../form-submission-consent/infrastructure/persistence/relational/entities/form-submission-consent.entity';
import { LocaleContext } from '../utils/i18n/locale-context';
import { pickLocalized } from '../utils/i18n/pick-localized';
import { FormsRepository } from './infrastructure/persistence/relational/forms.repository';
import {
  ANALYTICS_STATUS_ORDER,
  AnalyticsSummaryDto,
  FindAnalyticsDto,
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
  constructor(private readonly repository: FormsRepository) {}

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
  applyScope(
    qb: SelectQueryBuilder<FormSubmissionEntity>,
    range: Range,
    filters: FindAnalyticsDto & { formCode?: string },
    options: ScopeOptions = {},
  ): SelectQueryBuilder<FormSubmissionEntity> {
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
}
