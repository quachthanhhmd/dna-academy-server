import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'node:crypto';
import { PdfService } from '../../admin-dashboard/services/pdf.service';
import { AllConfigType } from '../../config/config.type';
import { CertificateDto } from '../dto/completion.dto';
import { renderCertificateHtml } from '../certificate-pdf-template';

/**
 * Epic 4.6 — the certificate download, rendered on the server.
 *
 * **Cached, not stored.** Epic 4.1 §3.2 sketched "render once, upload to R2,
 * persist `file_id`". The file uploaders in this codebase only accept a
 * multipart upload or hand out a presigned URL; none of them can store a
 * buffer the server produced itself, and adding that to every driver is
 * infrastructure work of its own. A certificate is small and its content
 * changes only when an admin regenerates it, so the rendered file is kept in
 * memory, keyed by a hash of everything printed on it:
 *
 * - a second download is served from memory, with no Chromium involved;
 * - a regenerate changes the snapshots, so the next download re-renders —
 *   nothing has to remember to invalidate anything;
 * - a restart simply renders again on first request.
 *
 * `fileUrl` stays null: there is still no stored file to link to.
 */
@Injectable()
export class CertificatePdfService {
  /** Enough for a busy afternoon of downloads; each entry is ~50KB. */
  static readonly MAX_CACHED = 200;

  private readonly cache = new Map<string, Buffer>();

  constructor(
    private readonly pdf: PdfService,
    private readonly configService: ConfigService<AllConfigType>,
  ) {}

  /** `DNA-2026-000118.pdf` — the number already carries the prefix. */
  static filename(certificate: Pick<CertificateDto, 'number'>): string {
    return `${certificate.number.replace(/[^A-Za-z0-9._-]/g, '_')}.pdf`;
  }

  async render(certificate: CertificateDto, locale: string): Promise<Buffer> {
    const data = {
      number: certificate.number,
      studentName: certificate.studentName,
      courseTitle: certificate.courseTitle,
      completionDate: certificate.completionDate,
      issuerName: certificate.issuerName,
      signatureUrl: certificate.signatureUrl ?? null,
      verifyUrl: this.verifyUrl(certificate.number, locale),
    };

    const key = createHash('sha256')
      .update(JSON.stringify({ ...data, locale }))
      .digest('hex');

    const cached = this.cache.get(key);

    if (cached) {
      // Re-insert so the Map's insertion order tracks recency.
      this.cache.delete(key);
      this.cache.set(key, cached);

      return cached;
    }

    const file = await this.pdf.render(renderCertificateHtml(data, locale), {
      landscape: true,
      marginMm: { top: 0, right: 0, bottom: 0, left: 0 },
    });

    this.cache.set(key, file);

    if (this.cache.size > CertificatePdfService.MAX_CACHED) {
      const oldest = this.cache.keys().next().value;

      if (oldest !== undefined) {
        this.cache.delete(oldest);
      }
    }

    return file;
  }

  /** The public page a reader of the printed file can check it on. */
  private verifyUrl(number: string, locale: string): string | null {
    const frontend = this.configService
      .get('app.frontendDomain', { infer: true })
      ?.replace(/\/+$/, '');

    return frontend
      ? `${frontend}/${locale === 'en' ? 'en' : 'vi'}/verify/${encodeURIComponent(number)}`
      : null;
  }
}
