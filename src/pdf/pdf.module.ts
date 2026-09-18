import { Module } from '@nestjs/common';
import { PdfService } from '../admin-dashboard/services/pdf.service';

/**
 * Server-rendered PDF, shared.
 *
 * `PdfService` keeps one headless Chromium for the whole process and caps
 * concurrent renders. Providing it from two feature modules would give each
 * its own browser and its own cap, so the dashboard export (Epic 7) and the
 * certificate download (Epic 4.6) both import it from here.
 */
@Module({
  providers: [PdfService],
  exports: [PdfService],
})
export class PdfModule {}
