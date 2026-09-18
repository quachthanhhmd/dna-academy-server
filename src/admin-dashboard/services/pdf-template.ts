import { OverviewData, Table } from './export-dataset.service';
import { KpiSet } from './kpis.service';

/**
 * Epic 7 BE-7 — the printable view.
 *
 * Pure string building, deliberately: the HTML can then be asserted in a unit
 * test without launching a browser, which is where every rule that matters
 * lives (a null renders "No data", a Vietnamese name survives escaping, an
 * absent reflection category is not a zero bar).
 */

/** Escapes text for HTML. Course titles and student names are user data. */
export const esc = (value: unknown): string =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/** §1.3 — an absence is never a zero. */
/** `1 answer`, `2 answers` — the report is read, not just scanned. */
const plural = (n: number, word: string): string =>
  `${n} ${word}${n === 1 ? '' : 's'}`;

export const show = (value: number | null | undefined, suffix = ''): string =>
  value === null || value === undefined
    ? '<span class="nodata">No data</span>'
    : `${esc(value)}${suffix}`;

const fmtDate = (value: unknown): string => {
  if (!value) {
    return '';
  }

  const date = value instanceof Date ? value : new Date(String(value));

  return Number.isNaN(date.getTime())
    ? esc(value)
    : date.toISOString().slice(0, 10);
};

const PALETTE = [
  '#2f6feb',
  '#00a37a',
  '#e8a33d',
  '#9aa4b2',
  '#c2410c',
  '#7c3aed',
];

const SOURCE_COLORS: Record<string, string> = {
  organic: '#2f6feb',
  admin: '#00a37a',
  coupon: '#e8a33d',
  // Muted, so it reads as missing data rather than a fourth channel (BE-3).
  unknown: '#c9cfd8',
};

/** Aligned with the donut: `completed` is the same green in both zones. */
const BUCKET_COLORS: Record<string, string> = {
  completed: '#00a37a',
  not_started: '#9aa4b2',
  '1-25': '#c2410c',
  '26-50': '#e8a33d',
  '51-75': '#2f6feb',
  '76-99': '#7c3aed',
};

const STATUS_COLORS: Record<string, string> = {
  enrolled: '#2f6feb',
  in_progress: '#e8a33d',
  completed: '#00a37a',
  cancelled: '#9aa4b2',
};

const empty = (label: string): string =>
  `<p class="empty">No data available${label ? ` — ${esc(label)}` : ''}</p>`;

/** Horizontal bars. Rows with a null value print "No data" and no bar. */
const barChart = (
  items: { label: string; value: number | null; note?: string }[],
  unit = '',
  colors?: Record<string, string>,
): string => {
  const max = Math.max(...items.map((i) => i.value ?? 0), 1);

  return `<div class="bars">${items
    .map((item, i) => {
      const width = item.value === null ? 0 : (item.value / max) * 100;

      return `<div class="bar-row">
        <div class="bar-label">${esc(item.label)}</div>
        <div class="bar-track">
          <div class="bar-fill" style="width:${width.toFixed(1)}%;background:${
            colors?.[item.label] ?? PALETTE[i % PALETTE.length]
          }"></div>
        </div>
        <div class="bar-value">${show(item.value, unit)}${
          item.note ? `<span class="bar-note">${esc(item.note)}</span>` : ''
        }</div>
      </div>`;
    })
    .join('')}</div>`;
};

/** Stacked columns for the enrolments series. */
const stackedColumns = (data: OverviewData['enrollments']): string => {
  if (!data.buckets.length) {
    return empty('no enrollments in this period');
  }

  const width = 680;
  const height = 200;
  const max = Math.max(...data.buckets.map((b) => b.total), 1);
  const slot = width / data.buckets.length;
  const barWidth = Math.min(slot * 0.62, 26);
  // A crowded axis is unreadable in print, so labels thin out rather than overlap.
  const step = Math.ceil(data.buckets.length / 12);

  const columns = data.buckets
    .map((bucket, i) => {
      const x = i * slot + (slot - barWidth) / 2;
      let y = height;

      const segments = data.sources
        .map((source) => {
          const value = Number(bucket[source] ?? 0);

          if (!value) {
            return '';
          }

          const h = (value / max) * (height - 10);
          y -= h;

          return `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barWidth.toFixed(
            1,
          )}" height="${h.toFixed(1)}" fill="${SOURCE_COLORS[source] ?? '#999'}"/>`;
        })
        .join('');

      const label =
        i % step === 0
          ? `<text x="${(x + barWidth / 2).toFixed(1)}" y="${height + 14}" class="tick">${esc(
              bucket.bucket.slice(5),
            )}</text>`
          : '';

      return segments + label;
    })
    .join('');

  const legend = data.sources
    .map(
      (s) =>
        `<span class="key"><i style="background:${SOURCE_COLORS[s] ?? '#999'}"></i>${esc(
          s,
        )}</span>`,
    )
    .join('');

  return `<svg viewBox="0 0 ${width} ${height + 22}" class="chart">
      <line x1="0" y1="${height}" x2="${width}" y2="${height}" class="axis"/>
      ${columns}
    </svg><div class="legend">${legend}</div>`;
};

/** Donut over the four enrolment statuses. */
const donut = (data: OverviewData['statuses']): string => {
  if (!data.statuses.length || !data.total) {
    return empty('no enrollments in this period');
  }

  const radius = 70;
  const thickness = 26;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  const rings = data.statuses
    .filter((s) => s.count > 0)
    .map((slice) => {
      const fraction = slice.count / data.total;
      const dash = fraction * circumference;
      const ring = `<circle r="${radius}" cx="100" cy="100" fill="none"
        stroke="${STATUS_COLORS[slice.status] ?? '#999'}" stroke-width="${thickness}"
        stroke-dasharray="${dash.toFixed(2)} ${(circumference - dash).toFixed(2)}"
        stroke-dashoffset="${(-offset).toFixed(2)}" transform="rotate(-90 100 100)"/>`;
      offset += dash;

      return ring;
    })
    .join('');

  const legend = data.statuses
    .map(
      (s) =>
        `<span class="key"><i style="background:${
          STATUS_COLORS[s.status] ?? '#999'
        }"></i>${esc(s.status)} · ${esc(s.count)}</span>`,
    )
    .join('');

  return `<svg viewBox="0 0 200 200" class="donut">${rings}
      <text x="100" y="96" class="donut-value">${esc(data.total)}</text>
      <text x="100" y="114" class="donut-label">enrollments</text>
    </svg><div class="legend">${legend}</div>`;
};

const KPI_CARDS: { key: keyof KpiSet; label: string; suffix?: string }[] = [
  { key: 'registeredStudents', label: 'Registered students' },
  { key: 'activeStudents', label: 'Active students' },
  { key: 'enrollments', label: 'Enrollments' },
  { key: 'completedCourses', label: 'Completed courses' },
  { key: 'completionRate', label: 'Completion rate', suffix: '%' },
  { key: 'avgProgress', label: 'Avg. progress', suffix: '%' },
  { key: 'avgRating', label: 'Avg. rating' },
];

const kpiGrid = (data: OverviewData): string =>
  `<div class="kpis">${KPI_CARDS.map(({ key, label, suffix }) => {
    const kpi = data.kpis[key];
    const pct = kpi.delta.pct;
    const delta =
      pct === null
        ? '<span class="delta flat">no comparison</span>'
        : `<span class="delta ${pct >= 0 ? 'up' : 'down'}">${
            pct >= 0 ? '▲' : '▼'
          } ${Math.abs(pct)}% vs previous</span>`;

    // BE-2/FE-2: the cohort window is printed under the rate, because it is
    // the number on this page most likely to be read as a quality score.
    const subtitle =
      key === 'completionRate'
        ? `<div class="cohort">of students who enrolled ${esc(
            data.meta.period.from.slice(0, 10),
          )} – ${esc(data.meta.period.to.slice(0, 10))}</div>`
        : '';

    return `<div class="kpi">
        <div class="kpi-label">${esc(label)}</div>
        <div class="kpi-value">${show(kpi.value, suffix ?? '')}</div>
        ${delta}${subtitle}
      </div>`;
  }).join('')}</div>`;

const filterLine = (meta: OverviewData['meta']): string => {
  const parts = [
    `Period ${esc(meta.period.from.slice(0, 10))} – ${esc(meta.period.to.slice(0, 10))}`,
  ];

  if (meta.courseId) {
    parts.push(`Course ${esc(meta.courseId)}`);
  }

  if (meta.groupId) {
    parts.push(`Group ${esc(meta.groupId)}`);
  }

  parts.push(`Timezone ${esc(meta.timezone)}`);

  return parts.join(' · ');
};

const STYLES = `
  /* Noto covers Vietnamese; the image installs font-noto for exactly this. */
  * { box-sizing: border-box; }
  body {
    font-family: 'Noto Sans', 'DejaVu Sans', 'Liberation Sans', sans-serif;
    color: #10151c; margin: 0; font-size: 11px; line-height: 1.45;
    /* A 1px inset so the rightmost border never lands exactly on the page's
       clip boundary, where it rounds away and the last card looks cut off. */
    padding-right: 1px;
  }
  h1 { font-size: 20px; margin: 0 0 2px; }
  h2 { font-size: 13px; margin: 0 0 8px; padding-bottom: 4px;
       border-bottom: 1px solid #e3e7ec; }
  .meta { color: #5b6675; font-size: 10px; margin-bottom: 16px; }
  section { margin-bottom: 18px; page-break-inside: avoid; }
  .kpis { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 8px; }
  .kpi-label { overflow-wrap: anywhere; }
  .kpi { border: 1px solid #e3e7ec; border-radius: 6px; padding: 8px 10px; }
  .kpi-label { color: #5b6675; font-size: 9.5px; text-transform: uppercase;
               letter-spacing: .04em; }
  .kpi-value { font-size: 20px; font-weight: 600; margin: 2px 0; }
  .delta { font-size: 9.5px; }
  .delta.up { color: #00795c; } .delta.down { color: #b42318; }
  .delta.flat, .nodata { color: #8a94a2; }
  .cohort { font-size: 9px; color: #5b6675; margin-top: 3px; }
  .two-col { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
             gap: 16px; }
  table { width: 100%; border-collapse: collapse; }
  th, td { text-align: left; padding: 5px 6px; border-bottom: 1px solid #eef1f4;
           vertical-align: top; }
  th { background: #f6f8fa; font-size: 9.5px; text-transform: uppercase;
       letter-spacing: .04em; color: #5b6675; }
  tbody tr:nth-child(even) { background: #fbfcfd; }
  .bars { display: flex; flex-direction: column; gap: 5px; }
  .question { font-size: 11px; margin: 10px 0 4px; font-weight: 600; }
  .question-meta { font-weight: 400; color: #5b6675; margin-left: 6px; }
  .bar-row { display: grid; grid-template-columns: minmax(130px, 45%) 1fr 90px;
             align-items: center; gap: 8px; }
  .bar-label { font-size: 10px; }
  .bar-track { background: #f0f3f6; border-radius: 3px; height: 12px; }
  .bar-fill { height: 12px; border-radius: 3px; }
  .bar-value { font-size: 10px; text-align: right; }
  .bar-note { color: #5b6675; margin-left: 5px; }
  .chart, .donut { width: 100%; height: auto; }
  .axis { stroke: #d7dde4; stroke-width: 1; }
  .tick { font-size: 8px; fill: #5b6675; text-anchor: middle; }
  .donut-value { font-size: 22px; font-weight: 600; text-anchor: middle; }
  .donut-label { font-size: 9px; fill: #5b6675; text-anchor: middle; }
  .legend { margin-top: 6px; font-size: 9.5px; color: #3d4753; }
  .key { margin-right: 12px; white-space: nowrap; }
  .key i { display: inline-block; width: 8px; height: 8px; border-radius: 2px;
           margin-right: 4px; }
  .empty { color: #8a94a2; font-style: italic; padding: 14px 0; }
  footer { color: #8a94a2; font-size: 9px; border-top: 1px solid #e3e7ec;
           padding-top: 6px; }
`;

const page = (title: string, body: string): string =>
  `<!doctype html><html lang="en"><head><meta charset="utf-8">
    <title>${esc(title)}</title><style>${STYLES}</style></head>
    <body>${body}</body></html>`;

/** The full dashboard, `dataset=overview`. */
export const renderOverview = (data: OverviewData): string => {
  const reflection = data.reflection;

  const body = `
    <h1>Admin Overview Dashboard</h1>
    <div class="meta">${filterLine(data.meta)} · generated ${esc(
      data.meta.generatedAt,
    )}</div>

    <section><h2>Key metrics</h2>${kpiGrid(data)}</section>

    <section><h2>Enrollments over time</h2>${stackedColumns(data.enrollments)}</section>

    <div class="two-col">
      <section><h2>Progress distribution</h2>${
        data.progress.buckets.length
          ? barChart(
              data.progress.buckets.map((b) => ({
                label: b.bucket,
                value: b.count,
                note: b.pct === null ? '' : `${b.pct}%`,
              })),
              '',
              BUCKET_COLORS,
            )
          : empty('no enrollments in this period')
      }</section>
      <section><h2>Enrollment status</h2>${donut(data.statuses)}</section>
    </div>

    <section><h2>Top courses</h2>${
      data.topCourses.length
        ? `<table><thead><tr><th>Course</th><th>Enrollments</th>
             <th>Completion</th><th>Avg. progress</th></tr></thead><tbody>${data.topCourses
               .map(
                 (
                   c,
                 ) => `<tr><td>${esc(c.title)}</td><td>${esc(c.enrollments)}</td>
                   <td>${show(c.completionRate, '%')}</td>
                   <td>${show(c.avgProgress, '%')}</td></tr>`,
               )
               .join('')}</tbody></table>`
        : empty('no enrollments in this period')
    }</section>

    <section><h2>Career reflection</h2>
      <div class="meta">${esc(plural(reflection.totalResponses, 'response'))} ·
        response rate ${show(reflection.responseRate.rate, '%')}
        (${esc(reflection.responseRate.responded)} of
         ${esc(reflection.responseRate.completed)} completed)</div>
      ${
        reflection.selections.length
          ? reflection.selections
              .map(
                (
                  question,
                ) => `<h3 class="question">${esc(question.questionText)}
                  <span class="question-meta">${esc(plural(question.answered, 'answer'))}</span></h3>
                  ${
                    question.answered
                      ? barChart(
                          question.options.map((option) => ({
                            label: option.label,
                            value: option.count,
                            note: option.pct === null ? '' : `${option.pct}%`,
                          })),
                        )
                      : empty('no answers to this question in this period')
                  }`,
              )
              .join('')
          : empty('no reflection questions are active')
      }
    </section>

    <footer>DNA Academy · figures follow ${esc(
      data.meta.timezone,
    )} calendar days · completion rate is cohort-based (D2)</footer>`;

  return page('Admin Overview Dashboard', body);
};

/** One dataset as a table, `dataset=<key>`. */
export const renderTable = (
  table: Table,
  meta: OverviewData['meta'],
): string => {
  const dateKeys = new Set(['enrollmentDate', 'completedAt', 'submittedAt']);

  const body = `
    <h1>${esc(table.title)}</h1>
    <div class="meta">${filterLine(meta)} · generated ${esc(meta.generatedAt)}</div>
    ${
      table.rows.length
        ? `<table><thead><tr>${table.columns
            .map((c) => `<th>${esc(c.label)}</th>`)
            .join('')}</tr></thead><tbody>${table.rows
            .map(
              (row) =>
                `<tr>${table.columns
                  .map((c) => {
                    const value = row[c.key];

                    if (value === null || value === undefined) {
                      return `<td>${show(null)}</td>`;
                    }

                    return `<td>${esc(
                      dateKeys.has(c.key) ? fmtDate(value) : value,
                    )}</td>`;
                  })
                  .join('')}</tr>`,
            )
            .join('')}</tbody></table>`
        : empty('')
    }
    <footer>DNA Academy · ${esc(table.rows.length)} rows · ${esc(
      meta.timezone,
    )}</footer>`;

  return page(table.title, body);
};
