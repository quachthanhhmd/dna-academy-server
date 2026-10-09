import { Injectable } from '@nestjs/common';
import ExcelJS from 'exceljs';
import { Resvg } from '@resvg/resvg-js';
import { LocaleContext } from '../utils/i18n/locale-context';
import { FormsRepository } from './infrastructure/persistence/relational/forms.repository';
import { FormsService } from './forms.service';
import { FormsAnalyticsService } from './forms-analytics.service';
import type { FindAnalyticsDto } from './dto/form-analytics.dto';
import {
  groupedBarsSvg,
  horizontalBarsSvg,
  lineChartSvg,
  SERIES_COLORS,
} from './analytics/chart-svg';

/**
 * PLAN-forms-insights export — an .xlsx for a tab, with two sheets:
 *
 *  - "Raw data": one row per in-scope submission, a column per question (all
 *    of a respondent's answers), plus when/status/source/locale.
 *  - "Visualize": the aggregated results as charts, each beside its table.
 *
 * Charts are embedded images: no maintained free library writes editable Excel
 * chart objects. The SVGs are rasterised with resvg (the API image carries
 * Noto fonts, so Vietnamese diacritics render).
 *
 * The scope is the same `applyScope` every analytics card uses, so the file
 * matches what the screen shows for the current filters.
 */

type RawSubmission = {
  id: string;
  formCode: string;
  createdAt: Date;
  status: string;
  source: string;
  locale: string;
  answers: Map<string, string>;
};

type ChartBlock = {
  svg: string;
  header: string[];
  rows: (string | number)[][];
};

@Injectable()
export class FormsAnalyticsExportService {
  constructor(
    private readonly repository: FormsRepository,
    private readonly formsService: FormsService,
    private readonly analytics: FormsAnalyticsService,
  ) {}

  async buildWorkbook(
    dto: FindAnalyticsDto & { formCode?: string },
  ): Promise<Buffer> {
    const summary = await this.analytics.getSummary(dto);
    const formCodes = dto.formCode
      ? [dto.formCode]
      : summary.forms.map((form) => form.formCode);

    // Question labels + option names, localised, in form order.
    const columns = new Map<string, string>();
    const optionNames = new Map<string, string>();
    for (const code of formCodes) {
      const definition = await this.formsService.getPublicDefinition(code);
      for (const section of definition.sections) {
        for (const question of section.questions) {
          if (!columns.has(question.code)) {
            columns.set(question.code, question.label);
          }
          for (const option of question.options ?? []) {
            const key = `${question.code}\u0000${option.code}`;
            if (!optionNames.has(key)) optionNames.set(key, option.name);
          }
        }
      }
    }

    const raw = await this.collectRaw(dto, optionNames);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'CAREER DNA';
    workbook.created = new Date();

    this.buildRawSheet(workbook, columns, raw, formCodes.length > 1);
    await this.buildVisualizeSheet(workbook, dto, formCodes, summary);

    const out = await workbook.xlsx.writeBuffer();
    return Buffer.from(out as unknown as Uint8Array);
  }

  // ───────────────────────────── raw data ─────────────────────────────

  private async collectRaw(
    dto: FindAnalyticsDto & { formCode?: string },
    optionNames: Map<string, string>,
  ): Promise<RawSubmission[]> {
    const range = this.analytics.resolveRange(dto);
    const qb = this.repository.submissionsRepo.createQueryBuilder('submission');
    this.analytics.applyScope(qb, range, dto);

    const submissions = await qb
      .select('submission.id', 'id')
      .addSelect('submission.createdAt', 'createdAt')
      .addSelect('submission.status', 'status')
      .addSelect('submission.source', 'source')
      .addSelect('submission.locale', 'locale')
      .addSelect('definition.code', 'formCode')
      .orderBy('submission.createdAt', 'DESC')
      .getRawMany<{
        id: string;
        createdAt: Date;
        status: string;
        source: string;
        locale: string;
        formCode: string;
      }>();

    const ids = submissions.map((row) => row.id);
    const answersById = new Map<
      string,
      Map<string, { text?: string; options: string[] }>
    >();
    const bucket = (submissionId: string, questionCode: string) => {
      const byQuestion =
        answersById.get(submissionId) ??
        new Map<string, { text?: string; options: string[] }>();
      answersById.set(submissionId, byQuestion);
      const entry = byQuestion.get(questionCode) ?? { options: [] };
      byQuestion.set(questionCode, entry);
      return entry;
    };

    if (ids.length > 0) {
      const texts = await this.repository.answersRepo
        .createQueryBuilder('answer')
        .innerJoin('answer.submission', 'submission')
        .innerJoin('answer.question', 'question')
        .where('submission.id IN (:...ids)', { ids })
        .select('submission.id', 'submissionId')
        .addSelect('question.code', 'questionCode')
        .addSelect('answer.textValue', 'textValue')
        .getRawMany<{
          submissionId: string;
          questionCode: string;
          textValue: string | null;
        }>();
      for (const row of texts) {
        if (row.textValue && row.textValue.trim() !== '') {
          bucket(row.submissionId, row.questionCode).text = row.textValue;
        }
      }

      const optionRows = await this.repository.answerOptionsRepo
        .createQueryBuilder('option')
        .innerJoin('option.submission', 'submission')
        .innerJoin('option.question', 'question')
        .where('submission.id IN (:...ids)', { ids })
        .select('submission.id', 'submissionId')
        .addSelect('question.code', 'questionCode')
        .addSelect('option.optionCode', 'optionCode')
        .getRawMany<{
          submissionId: string;
          questionCode: string;
          optionCode: string;
        }>();
      for (const row of optionRows) {
        bucket(row.submissionId, row.questionCode).options.push(row.optionCode);
      }
    }

    return submissions.map((row) => {
      const byQuestion = answersById.get(row.id) ?? new Map();
      const answers = new Map<string, string>();
      for (const [questionCode, entry] of byQuestion) {
        const names = entry.options.map(
          (code) => optionNames.get(`${questionCode}\u0000${code}`) ?? code,
        );
        answers.set(
          questionCode,
          names.length > 0 ? names.join(', ') : (entry.text ?? ''),
        );
      }
      return { ...row, answers };
    });
  }

  private buildRawSheet(
    workbook: ExcelJS.Workbook,
    columns: Map<string, string>,
    raw: RawSubmission[],
    multiForm: boolean,
  ): void {
    const sheet = workbook.addWorksheet('Raw data');
    const header = [
      'Submitted at',
      'Status',
      'Source',
      'Locale',
      ...(multiForm ? ['Form'] : []),
      ...[...columns.values()],
    ];
    sheet.addRow(header);
    sheet.getRow(1).font = { bold: true };

    for (const submission of raw) {
      const row = [
        this.formatDateTime(submission.createdAt),
        submission.status,
        submission.source,
        submission.locale,
        ...(multiForm ? [submission.formCode] : []),
        ...[...columns.keys()].map(
          (code) => submission.answers.get(code) ?? '',
        ),
      ];
      sheet.addRow(row);
    }

    sheet.getColumn(1).width = 18;
    sheet.getColumn(2).width = 12;
    sheet.getColumn(3).width = 12;
    sheet.getColumn(4).width = 8;
    let index = 5;
    if (multiForm) {
      sheet.getColumn(index).width = 22;
      index += 1;
    }
    for (let i = 0; i < columns.size; i += 1) {
      sheet.getColumn(index + i).width = 28;
    }
    sheet.views = [{ state: 'frozen', ySplit: 1 }];
  }

  // ───────────────────────────── visualize ─────────────────────────────

  private async buildVisualizeSheet(
    workbook: ExcelJS.Workbook,
    dto: FindAnalyticsDto & { formCode?: string },
    formCodes: string[],
    summary: Awaited<ReturnType<FormsAnalyticsService['getSummary']>>,
  ): Promise<void> {
    const sheet = workbook.addWorksheet('Visualize');
    const blocks: ChartBlock[] = [];

    const locale = LocaleContext.current();

    if (dto.formCode) {
      const questions = await this.analytics.getQuestions({
        ...dto,
        formCode: dto.formCode,
      });
      for (const question of questions.questions) {
        const ranked = [...question.options]
          .sort((a, b) => b.count - a.count)
          .slice(0, 12);
        blocks.push({
          svg: horizontalBarsSvg({
            title: question.label,
            rows: ranked.map((option) => ({
              label: option.name,
              value: option.count,
            })),
          }),
          header: [question.label, 'Count'],
          rows: ranked.map((option) => [option.name, option.count]),
        });
      }
    } else {
      const timeseries = await this.analytics.getTimeseries(dto);
      const nameByCode = new Map(
        summary.forms.map((form) => [form.formCode, form.formName]),
      );
      const labels = timeseries.points.map((point) => point.start);
      blocks.push({
        svg: lineChartSvg({
          title:
            locale === 'en'
              ? 'Submissions over time'
              : 'Phản hồi theo thời gian',
          labels,
          series: formCodes.map((code, index) => ({
            name: nameByCode.get(code) ?? code,
            color: SERIES_COLORS[index % SERIES_COLORS.length],
            values: timeseries.points.map((point) => point.byForm[code] ?? 0),
          })),
        }),
        header: [
          locale === 'en' ? 'Bucket' : 'Mốc thời gian',
          ...formCodes.map((code) => nameByCode.get(code) ?? code),
        ],
        rows: timeseries.points.map((point) => [
          point.start,
          ...formCodes.map((code) => point.byForm[code] ?? 0),
        ]),
      });

      blocks.push({
        svg: horizontalBarsSvg({
          title: locale === 'en' ? 'By source' : 'Theo nguồn',
          rows: summary.bySource
            .filter((row) => row.count > 0)
            .map((row) => ({ label: row.source, value: row.count })),
        }),
        header: [locale === 'en' ? 'Source' : 'Nguồn', 'Count'],
        rows: summary.bySource.map((row) => [row.source, row.count]),
      });

      blocks.push({
        svg: horizontalBarsSvg({
          title: locale === 'en' ? 'By status' : 'Theo trạng thái',
          rows: summary.byStatus
            .filter((row) => row.count > 0)
            .map((row) => ({ label: row.status, value: row.count })),
        }),
        header: [locale === 'en' ? 'Status' : 'Trạng thái', 'Count'],
        rows: summary.byStatus.map((row) => [row.status, row.count]),
      });

      const supplyDemand = await this.analytics.getSupplyDemand(dto);
      const rows = supplyDemand.rows.filter(
        (row) => row.demand > 0 || row.supply > 0,
      );
      blocks.push({
        svg: groupedBarsSvg({
          title:
            locale === 'en'
              ? 'Supply and demand by field'
              : 'Cung và cầu theo lĩnh vực',
          legend: [
            locale === 'en' ? 'Learner demand' : 'Nhu cầu học',
            locale === 'en' ? 'Instructor supply' : 'Nguồn giảng viên',
          ],
          rows: rows.map((row) => ({
            label: row.name,
            a: row.demand,
            b: row.supply,
          })),
        }),
        header: [
          locale === 'en' ? 'Field' : 'Lĩnh vực',
          locale === 'en' ? 'Demand' : 'Nhu cầu',
          locale === 'en' ? 'Supply' : 'Nguồn',
        ],
        rows: rows.map((row) => [row.name, row.demand, row.supply]),
      });
    }

    let cursor = 1; // 1-based cell row
    for (const block of blocks) {
      sheet.getCell(`A${cursor}`).value = block.header[0];
      block.header.slice(1).forEach((label, i) => {
        sheet.getCell(cursor, 2 + i).value = label;
      });
      sheet.getRow(cursor).font = { bold: true };
      block.rows.forEach((row, r) => {
        row.forEach((value, c) => {
          sheet.getCell(cursor + 1 + r, 1 + c).value = value;
        });
      });
      sheet.getColumn(1).width = 34;

      const dims = this.svgDims(block.svg);
      const png = new Resvg(block.svg, {
        fitTo: { mode: 'width', value: 760 },
        font: { loadSystemFonts: true, defaultFontFamily: 'Noto Sans' },
      })
        .render()
        .asPng();
      const imageId = workbook.addImage({
        buffer: png,
        extension: 'png',
      } as unknown as Parameters<typeof workbook.addImage>[0]);
      const imageWidth = 640;
      const imageHeight = imageWidth * (dims.h / dims.w);
      sheet.addImage(imageId, {
        tl: { col: 3, row: cursor - 1 },
        ext: { width: imageWidth, height: imageHeight },
      });

      const tableRows = block.rows.length + 1;
      const imageRows = Math.ceil(imageHeight / 20);
      cursor += Math.max(tableRows, imageRows) + 2;
    }
  }

  private svgDims(svg: string): { w: number; h: number } {
    const match = svg.match(/width="(\d+)" height="(\d+)"/);
    return { w: Number(match?.[1] ?? 760), h: Number(match?.[2] ?? 300) };
  }

  private formatDateTime(date: Date): string {
    const shifted = new Date(date.getTime() + 7 * 60 * 60 * 1000);
    return shifted.toISOString().slice(0, 16).replace('T', ' ');
  }
}
