/**
 * Epic 4.6 — the certificate as a document.
 *
 * Pure string building, like the dashboard report (`pdf-template.ts`): every
 * rule that matters — escaping a student's name, the date in Vietnam time,
 * the labels in the reader's language, a long course title still fitting on
 * one page — can be asserted without launching a browser.
 *
 * Layout mirrors the certificate card on `STU_CER_10`, so the file a student
 * downloads is recognisably the thing they were looking at: seal, title,
 * "this certifies that", name, "has completed", course, then date /
 * signature / certificate id along a rule.
 */

export type CertificatePdfData = {
  number: string;
  studentName: string;
  courseTitle: string;
  completionDate: Date | string;
  issuerName: string;
  signatureUrl?: string | null;
  /** Public verification page, e.g. `https://…/vi/verify/DNA-2026-000118`. */
  verifyUrl?: string | null;
};

type Labels = {
  title: string;
  certifies: string;
  completed: string;
  date: string;
  signature: string;
  certId: string;
  issuedBy: string;
  verifyAt: string;
};

/** Same copy as `certificate.json` on the client, so screen and file agree. */
const LABELS: Record<'vi' | 'en', Labels> = {
  vi: {
    title: 'Chứng nhận hoàn thành',
    certifies: 'Chứng nhận rằng',
    completed: 'đã hoàn thành khoá học',
    date: 'Ngày cấp',
    signature: 'Chữ ký có thẩm quyền',
    certId: 'Mã chứng chỉ',
    issuedBy: 'Cấp bởi',
    verifyAt: 'Xác thực tại',
  },
  en: {
    title: 'Certificate of Completion',
    certifies: 'This certifies that',
    completed: 'has successfully completed',
    date: 'Date',
    signature: 'Authorized Signature',
    certId: 'Cert ID',
    issuedBy: 'Issued by',
    verifyAt: 'Verify at',
  },
};

export const labelsFor = (locale: string): Labels =>
  LABELS[locale === 'en' ? 'en' : 'vi'];

/** Escapes text for HTML. Names and course titles are user data. */
export const escapeHtml = (value: unknown): string =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

/**
 * The completion date as a person reads it, in Vietnam time.
 *
 * The column is a UTC instant; formatting it in the server's zone would print
 * the previous day for anything completed before 07:00 in Hanoi.
 */
export function formatCompletionDate(
  value: Date | string,
  locale: string,
): string {
  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return new Intl.DateTimeFormat(locale === 'en' ? 'en-US' : 'vi-VN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Asia/Ho_Chi_Minh',
  }).format(date);
}

/**
 * Course titles run from "SQL cơ bản" to a full MIT catalogue name. One size
 * would either look lost on the short ones or push the long ones onto a
 * second page, so the size steps down with length.
 */
export function courseTitleSizePx(title: string): number {
  const length = [...title].length;

  if (length <= 48) return 30;
  if (length <= 80) return 25;
  if (length <= 120) return 21;

  return 18;
}

/** Only http(s) images are embedded; anything else draws the placeholder. */
const safeImageUrl = (url?: string | null): string | null =>
  url && /^https?:\/\//i.test(url) ? url : null;

export function renderCertificateHtml(
  data: CertificatePdfData,
  locale: string,
): string {
  const t = labelsFor(locale);
  const signature = safeImageUrl(data.signatureUrl);
  const lang = locale === 'en' ? 'en' : 'vi';

  return `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<title>${escapeHtml(t.title)} · ${escapeHtml(data.number)}</title>
<style>
  @page { size: A4 landscape; margin: 0; }
  * { box-sizing: border-box; }
  html, body { margin: 0; width: 297mm; height: 210mm; }
  body {
    /* Noto carries Vietnamese in the API image (see the Dockerfile). */
    font-family: 'Be Vietnam Pro', 'Noto Sans', 'DejaVu Sans', 'Helvetica Neue', Arial, sans-serif;
    color: #111714;
    background: #ffffff;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .page {
    position: relative;
    width: 297mm;
    height: 210mm;
    padding: 12mm;
    background:
      radial-gradient(circle at 12% 16%, rgba(6, 64, 46, 0.07), transparent 42%),
      radial-gradient(circle at 88% 86%, rgba(6, 64, 46, 0.05), transparent 38%),
      #ffffff;
  }
  .frame {
    height: 100%;
    border: 1.5px solid #c6dfd5;
    border-radius: 6px;
    padding: 14mm 20mm 10mm;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
  }
  .seal { width: 46px; height: 46px; color: #06402e; }
  .title {
    margin: 10px 0 0;
    font-size: 17px;
    font-weight: 700;
    letter-spacing: 0.22em;
    text-transform: uppercase;
  }
  .body { flex: 1; display: flex; flex-direction: column; justify-content: center; gap: 6px; width: 100%; }
  .muted { color: #4b6259; font-size: 14px; margin: 0; }
  .name {
    margin: 6px 0;
    font-size: 40px;
    line-height: 1.15;
    font-weight: 700;
    color: #06402e;
    letter-spacing: -0.01em;
  }
  .course { margin: 8px auto 0; max-width: 210mm; line-height: 1.3; font-weight: 700; }
  .footer {
    width: 100%;
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    align-items: end;
    gap: 16px;
    padding-top: 12px;
    border-top: 1px solid #c6dfd5;
  }
  .meta-label {
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: #4b6259;
    margin: 0 0 3px;
  }
  .meta-value { font-size: 13px; font-weight: 600; margin: 0; font-variant-numeric: tabular-nums; }
  .left { text-align: left; }
  .right { text-align: right; }
  .signature { display: flex; flex-direction: column; align-items: center; }
  .signature img { height: 44px; max-width: 160px; object-fit: contain; }
  .signature svg { width: 110px; height: 44px; stroke: #06402e; fill: none; stroke-width: 2; }
  .signature .meta-label { border-top: 1px solid #c6dfd5; padding: 4px 8px 0; margin-top: 2px; }
  .issuer { margin: 8px 0 0; font-size: 10px; color: #4b6259; }
</style>
</head>
<body>
<div class="page">
  <div class="frame">
    <svg class="seal" viewBox="0 0 48 48" aria-hidden="true">
      <circle cx="24" cy="19" r="13" fill="none" stroke="currentColor" stroke-width="2.5"/>
      <circle cx="24" cy="19" r="7.5" fill="currentColor"/>
      <path d="M16 30 L12 44 L19 40.5 L22.5 46 L24 32 M32 30 L36 44 L29 40.5 L25.5 46 L24 32" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round"/>
    </svg>
    <h1 class="title">${escapeHtml(t.title)}</h1>

    <div class="body">
      <p class="muted">${escapeHtml(t.certifies)}</p>
      <p class="name">${escapeHtml(data.studentName)}</p>
      <p class="muted">${escapeHtml(t.completed)}</p>
      <p class="course" style="font-size:${courseTitleSizePx(data.courseTitle)}px">${escapeHtml(data.courseTitle)}</p>
    </div>

    <div class="footer">
      <div class="left">
        <p class="meta-label">${escapeHtml(t.date)}</p>
        <p class="meta-value">${escapeHtml(formatCompletionDate(data.completionDate, locale))}</p>
      </div>
      <div class="signature">
        ${
          signature
            ? `<img src="${escapeHtml(signature)}" alt="${escapeHtml(t.signature)}">`
            : `<svg viewBox="0 0 100 40" aria-hidden="true"><path d="M10,30 Q30,10 50,25 T90,15" stroke-linecap="round"/><path d="M40,35 Q60,20 70,30" stroke-linecap="round"/></svg>`
        }
        <p class="meta-label">${escapeHtml(t.signature)}</p>
      </div>
      <div class="right">
        <p class="meta-label">${escapeHtml(t.certId)}</p>
        <p class="meta-value">${escapeHtml(data.number)}</p>
      </div>
    </div>

    <p class="issuer">${escapeHtml(t.issuedBy)} ${escapeHtml(data.issuerName)}${
      data.verifyUrl
        ? ` · ${escapeHtml(t.verifyAt)} ${escapeHtml(data.verifyUrl)}`
        : ''
    }</p>
  </div>
</div>
</body>
</html>`;
}
