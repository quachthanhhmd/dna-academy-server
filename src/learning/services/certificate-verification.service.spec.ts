import { describe, expect, it, beforeEach, jest } from '@jest/globals';
import { NotFoundException } from '@nestjs/common';
import { CertificateVerificationService } from './certificate-verification.service';

/**
 * Epic 4.1 D3 — this is a public, unauthenticated endpoint sitting in front of
 * a table keyed by a sequence that starts at 1. Everything asserted here is
 * about what it must *not* return.
 */
describe('CertificateVerificationService', () => {
  let service: CertificateVerificationService;
  let certificatesService: Record<string, jest.Mock<any>>;
  let configService: Record<string, jest.Mock<any>>;

  const stored = {
    id: 'cert-1',
    certificateNumber: 'DNA-2026-000123',
    studentNameSnapshot: 'Nguyễn Văn An',
    courseTitleSnapshot: 'Advanced Genomic Sequencing',
    completionDate: new Date('2026-10-24T00:00:00.000Z'),
    issuedAt: new Date('2026-10-24T09:12:00.000Z'),
    enrollment: { id: 'enr-1' },
    student: { id: 7, email: 'student@example.com', firstName: 'An' },
    course: { id: 'course-1', slug: 'genomics' },
  };

  beforeEach(() => {
    certificatesService = {
      findByNumber: (jest.fn() as jest.Mock<any>).mockResolvedValue(stored),
    };
    configService = {
      getOrThrow: (jest.fn() as jest.Mock<any>).mockReturnValue(
        'DNA Learning Academy',
      ),
    };

    service = new CertificateVerificationService(
      certificatesService as never,
      configService as never,
    );
  });

  it('should confirm a certificate that exists', async () => {
    await expect(service.verify('DNA-2026-000123')).resolves.toMatchObject({
      valid: true,
      number: 'DNA-2026-000123',
      courseTitle: 'Advanced Genomic Sequencing',
      issuerName: 'DNA Learning Academy',
    });
  });

  it('should mask the student name', async () => {
    const result = await service.verify('DNA-2026-000123');

    expect(result.studentName).toBe('Nguyễn Văn A.');
  });

  it('should return the completion date as an ISO datetime', async () => {
    const result = await service.verify('DNA-2026-000123');

    expect(result.completionDate).toEqual(stored.completionDate);
  });

  // The whole point of D3: a sequence starting at 1 means this endpoint can be
  // walked. Nothing here may identify a person or an internal record.
  it('should expose nothing but the snapshot fields', async () => {
    const result = await service.verify('DNA-2026-000123');

    expect(Object.keys(result).sort()).toEqual([
      'completionDate',
      'courseTitle',
      'issuerName',
      'number',
      'studentName',
      'valid',
    ]);
  });

  it.each([
    ['the full student name', 'Nguyễn Văn An'],
    ['the student email', 'student@example.com'],
    ['the enrolment id', 'enr-1'],
    ['the course id', 'course-1'],
    ['the certificate id', 'cert-1'],
  ])('should not leak %s', async (_label, secret) => {
    const result = await service.verify('DNA-2026-000123');

    expect(JSON.stringify(result)).not.toContain(secret);
  });

  it('should 404 an unknown number', async () => {
    certificatesService.findByNumber.mockResolvedValue(null);

    await expect(service.verify('DNA-2026-999999')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('should answer an unknown number with exactly { valid: false }', async () => {
    certificatesService.findByNumber.mockResolvedValue(null);

    // toEqual, not toMatchObject: the point is that nothing *else* is in the
    // body either.
    await expect(service.verify('DNA-2026-999999')).rejects.toMatchObject({
      response: { valid: false },
    });
    await expect(
      service.verify('DNA-2026-999999').catch((e) => e.response),
    ).resolves.toEqual({ valid: false });
  });

  // Same body for malformed and not-found: a different one would tell an
  // attacker which numbers are well-formed, and therefore which exist.
  it('should answer a malformed number identically, without querying', async () => {
    await expect(service.verify('not-a-number')).rejects.toMatchObject({
      response: { valid: false },
    });

    expect(certificatesService.findByNumber).not.toHaveBeenCalled();
  });

  it.each([
    '',
    '   ',
    'DNA-2026',
    'DNA-20XX-000001',
    'DNA-2026-12345',
    "' OR 1=1--",
  ])('should reject %p without a lookup', async (input) => {
    await expect(service.verify(input)).rejects.toMatchObject({
      response: { valid: false },
    });

    expect(certificatesService.findByNumber).not.toHaveBeenCalled();
  });

  it('should accept a well-formed number in any letter case', async () => {
    await expect(service.verify('dna-2026-000123')).resolves.toMatchObject({
      valid: true,
    });

    expect(certificatesService.findByNumber).toHaveBeenCalledWith(
      'DNA-2026-000123',
    );
  });

  it('should trim surrounding whitespace before matching', async () => {
    await expect(service.verify('  DNA-2026-000123  ')).resolves.toMatchObject({
      valid: true,
    });
  });
});
