/**
 * PLAN-forms-insights export — tiny SVG chart builders.
 *
 * The export's "Visualize" sheet embeds charts as images (no free library can
 * write editable Excel chart objects), so these functions return an SVG string
 * that `@resvg/resvg-js` rasterises to a PNG. Kept pure and dependency-free so
 * the shapes are easy to reason about and unit-test.
 *
 * Colours are the export palette (hex), not the app's CSS vars: an exported
 * file has no stylesheet to resolve them.
 */

const FONT = 'Noto Sans, Arial, Helvetica, sans-serif';
const INK = '#1b1b1b';
const MUTED = '#5b6470';
const TRACK = '#e9eef4';

export const SERIES_COLORS = ['#3987e5', '#d95926', '#199e70', '#7a52d4'];

const esc = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const clip = (value: string, max: number) =>
  value.length > max ? `${value.slice(0, max - 1)}…` : value;

const wrap = (width: number, height: number, body: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" font-family="${FONT}">` +
  `<rect width="${width}" height="${height}" fill="#ffffff"/>${body}</svg>`;

export type BarRow = { label: string; value: number; color?: string };

/** Horizontal bars, one row per category. Good for distributions. */
export function horizontalBarsSvg(opts: {
  title: string;
  rows: BarRow[];
  color?: string;
  width?: number;
}): string {
  const width = opts.width ?? 760;
  const rowH = 30;
  const top = 52;
  const left = 230;
  const right = 90;
  const rows = opts.rows;
  const height = top + Math.max(rows.length, 1) * rowH + 12;
  const max = Math.max(1, ...rows.map((row) => row.value));
  const barMax = width - left - right;
  const color = opts.color ?? SERIES_COLORS[0];

  const body = rows
    .map((row, index) => {
      const y = top + index * rowH;
      const w = Math.max(0, (row.value / max) * barMax);
      return (
        `<text x="12" y="${y + 18}" font-size="13" fill="${INK}">${esc(clip(row.label, 30))}</text>` +
        `<rect x="${left}" y="${y + 6}" width="${barMax}" height="14" rx="3" fill="${TRACK}"/>` +
        `<rect x="${left}" y="${y + 6}" width="${w}" height="14" rx="3" fill="${row.color ?? color}"/>` +
        `<text x="${left + w + 8}" y="${y + 18}" font-size="12" fill="${MUTED}">${row.value}</text>`
      );
    })
    .join('');

  return wrap(
    width,
    height,
    `<text x="12" y="30" font-size="17" font-weight="700" fill="${INK}">${esc(clip(opts.title, 60))}</text>` +
      body,
  );
}

export type LineSeries = { name: string; values: number[]; color?: string };

/** A simple multi-series line chart with axes, for the submissions trend. */
export function lineChartSvg(opts: {
  title: string;
  labels: string[];
  series: LineSeries[];
  width?: number;
}): string {
  const width = opts.width ?? 760;
  const height = 320;
  const left = 56;
  const right = 24;
  const top = 56;
  const bottom = 48;
  const plotW = width - left - right;
  const plotH = height - top - bottom;
  const labels = opts.labels;
  const max = Math.max(1, ...opts.series.flatMap((s) => s.values));
  const steps = 4;

  const x = (index: number) =>
    labels.length <= 1
      ? left + plotW / 2
      : left + (index / (labels.length - 1)) * plotW;
  const y = (value: number) => top + plotH - (value / max) * plotH;

  const grid = Array.from({ length: steps + 1 }, (_, i) => {
    const value = (max / steps) * i;
    const gy = y(value);
    return (
      `<line x1="${left}" y1="${gy}" x2="${left + plotW}" y2="${gy}" stroke="${TRACK}"/>` +
      `<text x="${left - 8}" y="${gy + 4}" font-size="11" fill="${MUTED}" text-anchor="end">${Math.round(
        value,
      )}</text>`
    );
  }).join('');

  // Show at most ~8 x labels so long ranges stay legible.
  const stride = Math.ceil(labels.length / 8) || 1;
  const xLabels = labels
    .map((label, index) =>
      index % stride === 0
        ? `<text x="${x(index)}" y="${top + plotH + 20}" font-size="11" fill="${MUTED}" text-anchor="middle">${esc(
            label.slice(5),
          )}</text>`
        : '',
    )
    .join('');

  const lines = opts.series
    .map((series, index) => {
      const color = series.color ?? SERIES_COLORS[index % SERIES_COLORS.length];
      const points = series.values
        .map((value, i) => `${x(i)},${y(value)}`)
        .join(' ');
      return `<polyline points="${points}" fill="none" stroke="${color}" stroke-width="2"/>`;
    })
    .join('');

  const legend = opts.series
    .map((series, index) => {
      const color = series.color ?? SERIES_COLORS[index % SERIES_COLORS.length];
      const lx = left + index * 150;
      return (
        `<rect x="${lx}" y="36" width="10" height="10" rx="2" fill="${color}"/>` +
        `<text x="${lx + 16}" y="45" font-size="12" fill="${INK}">${esc(clip(series.name, 18))}</text>`
      );
    })
    .join('');

  return wrap(
    width,
    height,
    `<text x="12" y="24" font-size="17" font-weight="700" fill="${INK}">${esc(clip(opts.title, 60))}</text>` +
      legend +
      grid +
      xLabels +
      lines,
  );
}

/** Two bars per row (demand over supply), for the supply/demand card. */
export function groupedBarsSvg(opts: {
  title: string;
  rows: { label: string; a: number; b: number }[];
  legend: [string, string];
  width?: number;
}): string {
  const width = opts.width ?? 760;
  const rowH = 42;
  const top = 64;
  const left = 230;
  const right = 90;
  const rows = opts.rows;
  const height = top + Math.max(rows.length, 1) * rowH + 12;
  const max = Math.max(1, ...rows.flatMap((row) => [row.a, row.b]));
  const barMax = width - left - right;
  const half = 13;

  const legend =
    `<rect x="${left}" y="40" width="10" height="10" rx="2" fill="${SERIES_COLORS[0]}"/>` +
    `<text x="${left + 16}" y="49" font-size="12" fill="${INK}">${esc(opts.legend[0])}</text>` +
    `<rect x="${left + 150}" y="40" width="10" height="10" rx="2" fill="${SERIES_COLORS[2]}"/>` +
    `<text x="${left + 166}" y="49" font-size="12" fill="${INK}">${esc(opts.legend[1])}</text>`;

  const body = rows
    .map((row, index) => {
      const y = top + index * rowH;
      const wa = Math.max(0, (row.a / max) * barMax);
      const wb = Math.max(0, (row.b / max) * barMax);
      return (
        `<text x="12" y="${y + 20}" font-size="13" fill="${INK}">${esc(clip(row.label, 30))}</text>` +
        `<rect x="${left}" y="${y + 4}" width="${wa}" height="${half}" rx="3" fill="${SERIES_COLORS[0]}"/>` +
        `<text x="${left + wa + 8}" y="${y + 15}" font-size="11" fill="${MUTED}">${row.a}</text>` +
        `<rect x="${left}" y="${y + 21}" width="${wb}" height="${half}" rx="3" fill="${SERIES_COLORS[2]}"/>` +
        `<text x="${left + wb + 8}" y="${y + 32}" font-size="11" fill="${MUTED}">${row.b}</text>`
      );
    })
    .join('');

  return wrap(
    width,
    height,
    `<text x="12" y="24" font-size="17" font-weight="700" fill="${INK}">${esc(clip(opts.title, 60))}</text>` +
      legend +
      body,
  );
}
