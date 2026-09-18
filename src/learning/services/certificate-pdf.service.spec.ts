import { CertificatePdfService } from './certificate-pdf.service';

const certificate = {
  id: 'c1',
  number: 'DNA-2026-000118',
  studentName: 'John Doe',
  courseTitle: 'MIT 18.642',
  completionDate: new Date('2026-09-06T09:00:09.671Z'),
  issuedAt: null,
  finalGradePct: null,
  gradeLabel: null,
  issuerName: 'DNA Learning Academy',
  signatureUrl: null,
  fileUrl: null,
} as never;

function setup() {
  const pdf = {
    render: jest.fn(() => Promise.resolve(Buffer.from('%PDF-1.4'))),
  };
  const config = { get: jest.fn(() => 'http://localhost:3000/') };
  const service = new CertificatePdfService(pdf as never, config as never);

  return { pdf, config, service };
}

describe('CertificatePdfService', () => {
  it('should render A4 landscape, edge to edge', async () => {
    const { pdf, service } = setup();

    await service.render(certificate, 'vi');

    expect(pdf.render).toHaveBeenCalledWith(
      expect.stringContaining('John Doe'),
      { landscape: true, marginMm: { top: 0, right: 0, bottom: 0, left: 0 } },
    );
  });

  it('should serve a repeat download from memory', async () => {
    const { pdf, service } = setup();

    const first = await service.render(certificate, 'vi');
    const second = await service.render(certificate, 'vi');

    expect(second).toBe(first);
    expect(pdf.render).toHaveBeenCalledTimes(1);
  });

  it('should re-render when anything printed changes — a regenerate, or the language', async () => {
    const { pdf, service } = setup();

    await service.render(certificate, 'vi');
    await service.render(
      { ...(certificate as object), studentName: 'Jane Doe' } as never,
      'vi',
    );
    await service.render(certificate, 'en');

    expect(pdf.render).toHaveBeenCalledTimes(3);
  });

  it('should print a verify link on the frontend, in the reader’s language', async () => {
    const { pdf, service } = setup();

    await service.render(certificate, 'en');

    expect(pdf.render).toHaveBeenCalledWith(
      expect.stringContaining(
        'http://localhost:3000/en/verify/DNA-2026-000118',
      ),
      expect.anything(),
    );
  });

  it('should keep the cache bounded', async () => {
    const { pdf, service } = setup();

    for (let index = 0; index <= CertificatePdfService.MAX_CACHED; index++) {
      await service.render(
        { ...(certificate as object), number: `DNA-${index}` } as never,
        'vi',
      );
    }
    // The first entry was evicted, so it renders again.
    await service.render(
      { ...(certificate as object), number: 'DNA-0' } as never,
      'vi',
    );

    expect(pdf.render).toHaveBeenCalledTimes(
      CertificatePdfService.MAX_CACHED + 2,
    );
  });

  it('should build a safe filename from the number', () => {
    expect(CertificatePdfService.filename({ number: 'DNA-2026-000118' })).toBe(
      'DNA-2026-000118.pdf',
    );
    expect(CertificatePdfService.filename({ number: 'a"b/c' })).toBe(
      'a_b_c.pdf',
    );
  });
});
