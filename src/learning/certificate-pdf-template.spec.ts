import {
  courseTitleSizePx,
  escapeHtml,
  formatCompletionDate,
  renderCertificateHtml,
} from './certificate-pdf-template';

const base = {
  number: 'DNA-2026-000118',
  studentName: 'Nguyễn Thu Hà',
  courseTitle:
    'MIT 18.642 — Topics in Mathematics with Applications in Finance',
  completionDate: '2026-09-06T09:00:09.671Z',
  issuerName: 'DNA Learning Academy',
  signatureUrl: null,
  verifyUrl: 'http://localhost:3000/vi/verify/DNA-2026-000118',
};

describe('certificate pdf template', () => {
  it('should print the snapshots, with Vietnamese names intact', () => {
    const html = renderCertificateHtml(base, 'vi');

    expect(html).toContain('Nguyễn Thu Hà');
    expect(html).toContain('DNA-2026-000118');
    expect(html).toContain('Chứng nhận hoàn thành');
    expect(html).toContain('Cấp bởi DNA Learning Academy');
    expect(html).toContain('Xác thực tại http://localhost:3000/vi/verify/');
    expect(html).toContain('lang="vi"');
  });

  it('should use English labels for en, Vietnamese for anything else', () => {
    expect(renderCertificateHtml(base, 'en')).toContain(
      'Certificate of Completion',
    );
    expect(renderCertificateHtml(base, 'fr')).toContain(
      'Chứng nhận hoàn thành',
    );
  });

  it('should escape user data rather than rendering it as markup', () => {
    const html = renderCertificateHtml(
      { ...base, studentName: '<img src=x onerror=alert(1)>' },
      'vi',
    );

    expect(html).not.toContain('<img src=x');
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
    expect(escapeHtml(`"a" & 'b'`)).toBe('&quot;a&quot; &amp; &#39;b&#39;');
  });

  it('should date the certificate in Vietnam time, not the server zone', () => {
    // 23:30 UTC on the 5th is 06:30 on the 6th in Hanoi.
    expect(formatCompletionDate('2026-09-05T23:30:00Z', 'en')).toBe(
      'September 6, 2026',
    );
    expect(formatCompletionDate('2026-09-05T23:30:00Z', 'vi')).toContain('6');
    expect(formatCompletionDate('not a date', 'vi')).toBe('');
  });

  it('should draw the placeholder stroke unless the signature is an http(s) image', () => {
    expect(renderCertificateHtml(base, 'vi')).not.toContain('<img');
    expect(
      renderCertificateHtml(
        { ...base, signatureUrl: 'javascript:alert(1)' },
        'vi',
      ),
    ).not.toContain('<img');
    expect(
      renderCertificateHtml(
        { ...base, signatureUrl: 'https://cdn.example.com/sign.png' },
        'vi',
      ),
    ).toContain('<img src="https://cdn.example.com/sign.png"');
  });

  it('should step the course title down as it gets longer, so it stays on one page', () => {
    expect(courseTitleSizePx('SQL cơ bản')).toBe(30);
    expect(courseTitleSizePx(base.courseTitle)).toBe(25);
    expect(courseTitleSizePx('x'.repeat(100))).toBe(21);
    expect(courseTitleSizePx('x'.repeat(200))).toBe(18);
  });

  it('should omit the verify link when no frontend domain is configured', () => {
    expect(
      renderCertificateHtml({ ...base, verifyUrl: null }, 'vi'),
    ).not.toContain('Xác thực tại');
  });
});
