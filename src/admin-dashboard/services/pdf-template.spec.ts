import { describe, expect, it } from '@jest/globals';
import { DashboardMeta } from '../dashboard-context';
import { OverviewData, Table } from './export-dataset.service';
import { KpiSet } from './kpis.service';
import { esc, renderOverview, renderTable, show } from './pdf-template';

const meta: DashboardMeta = {
  period: {
    from: '2026-03-02T00:00:00+07:00',
    to: '2026-03-08T23:59:59+07:00',
  },
  courseId: null,
  groupId: null,
  timezone: 'Asia/Ho_Chi_Minh',
  generatedAt: '2026-03-09T09:00:00+07:00',
};

const kpi = (value: number | null) => ({
  value,
  delta: { current: value, previous: 1, pct: 10 },
  series: [],
});

const kpis = (overrides: Partial<KpiSet> = {}): KpiSet =>
  ({
    registeredStudents: kpi(10),
    activeStudents: kpi(4),
    enrollments: kpi(10),
    completedCourses: kpi(3),
    completionRate: kpi(30),
    avgProgress: kpi(40),
    avgRating: kpi(4.5),
    ...overrides,
  }) as KpiSet;

const overview = (over: Partial<OverviewData> = {}): OverviewData => ({
  kpis: kpis(),
  enrollments: { sources: ['organic', 'unknown'], buckets: [], total: 0 },
  progress: { buckets: [], total: 0 },
  topCourses: [],
  statuses: { statuses: [], total: 0 },
  reflection: {
    selections: [],
    freeText: [],
    totalResponses: 0,
    totalAnswers: 0,
    responseRate: { rate: null, responded: 0, completed: 0 },
  },
  meta,
  ...over,
});

/** Epic 7 BE-7 — the rules the printed page has to obey. */
describe('pdf template', () => {
  describe('escaping', () => {
    it('should escape markup in user data', () => {
      expect(esc('<script>alert(1)</script>')).toBe(
        '&lt;script&gt;alert(1)&lt;/script&gt;',
      );
    });

    it('should escape ampersands and quotes', () => {
      expect(esc('Toán & "Lý"')).toBe('Toán &amp; &quot;Lý&quot;');
    });

    it('should leave Vietnamese diacritics alone', () => {
      expect(esc('Nguyễn Thị Hường')).toBe('Nguyễn Thị Hường');
    });

    it('should render null as empty', () => {
      expect(esc(null)).toBe('');
    });
  });

  describe('absence is not zero (§1.3)', () => {
    it('should print "No data" for a null value', () => {
      expect(show(null)).toContain('No data');
    });

    it('should not print a zero for a null', () => {
      expect(show(null)).not.toContain('0');
    });

    it('should print a real zero as a zero', () => {
      expect(show(0)).toBe('0');
    });

    it('should append the unit only to a real value', () => {
      expect(show(30, '%')).toBe('30%');
      expect(show(null, '%')).not.toContain('%');
    });
  });

  describe('overview', () => {
    it('should render every KPI card', () => {
      const html = renderOverview(overview());

      for (const label of [
        'Registered students',
        'Active students',
        'Enrollments',
        'Completed courses',
        'Completion rate',
        'Avg. progress',
        'Avg. rating',
      ]) {
        expect(html).toContain(label);
      }
    });

    it('should print the cohort window under the completion rate', () => {
      // BE-2: the number most likely to be misread as a quality score.
      const html = renderOverview(overview());

      expect(html).toContain(
        'of students who enrolled 2026-03-02 – 2026-03-08',
      );
    });

    it('should say "No data available" for an empty period, not draw a zero chart', () => {
      const html = renderOverview(overview());

      expect(html).toContain('No data available');
      expect(html).not.toContain('<rect');
    });

    it('should render a null KPI as "No data"', () => {
      const html = renderOverview(
        overview({ kpis: kpis({ completionRate: kpi(null) }) }),
      );

      expect(html).toContain('No data');
    });

    const reflection = (selections: unknown[]) =>
      overview({
        reflection: {
          selections,
          freeText: [],
          totalResponses: 5,
          totalAnswers: 10,
          responseRate: { rate: 50, responded: 5, completed: 10 },
        } as never,
      });

    it('should draw one bar chart per selection question (Epic 4.6 §6)', () => {
      const html = renderOverview(
        reflection([
          {
            questionId: 'q2',
            questionText: 'Bạn đạt được gì sau khi hoàn thành khóa học',
            displayOrder: 2,
            courseId: null,
            answered: 4,
            responseShare: 80,
            options: [
              { key: 1, label: 'Có thể hợp', count: 3, pct: 75 },
              { key: 2, label: 'Không hợp', count: 1, pct: 25 },
            ],
          },
        ]),
      );

      expect(html).toContain('Bạn đạt được gì sau khi hoàn thành khóa học');
      expect(html).toContain('Có thể hợp');
      expect(html).toContain('75%');
      expect(html).toContain('4 answers');
    });

    it('should say "1 answer", not "1 answers"', () => {
      const html = renderOverview(
        reflection([
          {
            questionId: 'q5',
            questionText: 'Chia sẻ?',
            displayOrder: 5,
            courseId: null,
            answered: 1,
            responseShare: 100,
            options: [
              { key: 1, label: 'Chắc chắn', count: 1, pct: 100 },
              { key: 2, label: 'Không phải lúc này', count: 0, pct: 0 },
            ],
          },
        ]),
      );

      expect(html).toContain('1 answer<');
      expect(html).not.toContain('1 answers');
    });

    it('should show an empty state for a question nobody answered, not a row of zero bars', () => {
      const html = renderOverview(
        reflection([
          {
            questionId: 'q3',
            questionText: 'Dự định tiếp theo?',
            displayOrder: 3,
            courseId: null,
            answered: 0,
            responseShare: null,
            options: [
              { key: 1, label: 'Tìm hiểu ngành khác', count: 0, pct: null },
              { key: 2, label: 'Tìm mentor', count: 0, pct: null },
            ],
          },
        ]),
      );

      expect(html).toContain('no answers to this question in this period');
      expect(html).not.toContain('Tìm mentor');
    });

    it('should escape an option label, which is admin-authored text', () => {
      const html = renderOverview(
        reflection([
          {
            questionId: 'q9',
            questionText: 'Q',
            displayOrder: 9,
            courseId: null,
            answered: 1,
            responseShare: 100,
            options: [
              {
                key: 1,
                label: '<img src=x onerror=alert(1)>',
                count: 1,
                pct: 100,
              },
              { key: 2, label: 'B', count: 0, pct: 0 },
            ],
          },
        ]),
      );

      expect(html).not.toContain('<img src=x');
      expect(html).toContain('&lt;img src=x');
    });

    it('should escape a course title in the top-courses table', () => {
      const html = renderOverview(
        overview({
          topCourses: [
            {
              courseId: 'c1',
              courseCode: null,
              title: 'Toán & <b>Lý</b>',
              enrollments: 3,
              completionRate: null,
              avgProgress: 50,
            },
          ],
        }),
      );

      expect(html).toContain('Toán &amp; &lt;b&gt;Lý&lt;/b&gt;');
      expect(html).not.toContain('<b>Lý</b>');
    });

    it('should carry the resolved filters into the header', () => {
      const html = renderOverview(
        overview({ meta: { ...meta, courseId: 'abc', groupId: 'def' } }),
      );

      expect(html).toContain('Course abc');
      expect(html).toContain('Group def');
      expect(html).toContain('Asia/Ho_Chi_Minh');
    });
  });

  describe('single dataset', () => {
    const table: Table = {
      key: 'students',
      title: 'Students',
      columns: [
        { key: 'fullName', label: 'Name' },
        { key: 'progressPct', label: 'Progress' },
        { key: 'enrollmentDate', label: 'Enrolled' },
      ],
      rows: [
        {
          fullName: 'Nguyễn Thị Hường',
          progressPct: null,
          enrollmentDate: new Date('2026-03-04T03:00:00Z'),
        },
      ],
    };

    it('should render the rows with the title and filters', () => {
      const html = renderTable(table, meta);

      expect(html).toContain('Students');
      expect(html).toContain('Nguyễn Thị Hường');
      expect(html).toContain('2026-03-02 – 2026-03-08');
    });

    it('should render a null cell as "No data"', () => {
      expect(renderTable(table, meta)).toContain('No data');
    });

    it('should format a date column as a plain day', () => {
      expect(renderTable(table, meta)).toContain('2026-03-04');
    });

    it('should show the empty state when there are no rows', () => {
      const html = renderTable({ ...table, rows: [] }, meta);

      expect(html).toContain('No data available');
      expect(html).not.toContain('<tbody>');
    });

    it('should declare a charset so diacritics survive the byte stream', () => {
      expect(renderTable(table, meta)).toContain('<meta charset="utf-8">');
    });
  });
});
