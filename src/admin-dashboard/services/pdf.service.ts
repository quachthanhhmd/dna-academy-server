import {
  GatewayTimeoutException,
  Injectable,
  Logger,
  OnModuleDestroy,
  ServiceUnavailableException,
} from '@nestjs/common';
import { existsSync } from 'node:fs';
import type { Browser } from 'puppeteer-core';

/**
 * Page setup for one render. Omitted fields keep the dashboard report's
 * defaults — portrait A4 with a printed margin.
 */
export type PdfRenderOptions = {
  landscape?: boolean;
  /** Millimetres. The certificate uses 0 and draws its own border. */
  marginMm?: { top: number; right: number; bottom: number; left: number };
};

/** Where Chromium lives, in order of preference. */
const CANDIDATE_PATHS = [
  '/usr/bin/chromium-browser',
  '/usr/bin/chromium',
  '/usr/bin/google-chrome',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
];

/**
 * Epic 7 BE-7 — server-rendered PDF.
 *
 * Headless Chromium against the HTML in `pdf-template.ts`. PDFKit and pdfmake
 * were the alternatives and both mean redrawing every chart by hand in a
 * drawing API; the charts here are already SVG.
 *
 * `puppeteer-core` rather than `puppeteer`: the image supplies Chromium (see
 * the Dockerfile), so bundling a second copy would add ~150MB to every
 * `npm install` and every CI run for a binary that is never used.
 *
 * **Bounded on purpose.** A render is seconds, not milliseconds. Two limits
 * keep one export from becoming everyone's problem: a hard timeout that fails
 * as a clear 504, and a cap on concurrent renders that sheds load as 503
 * rather than launching a tenth browser and exhausting the container.
 */
@Injectable()
export class PdfService implements OnModuleDestroy {
  private readonly logger = new Logger(PdfService.name);
  private browser?: Browser;
  private launching?: Promise<Browser>;
  private active = 0;

  static readonly TIMEOUT_MS = 30_000;
  static readonly MAX_CONCURRENT = 2;

  /** A4 in millimetres, and the margins the PDF is printed with. */
  private static readonly PAGE_WIDTH_MM = 210;
  private static readonly PAGE_HEIGHT_MM = 297;
  private static readonly MARGIN_MM = {
    top: 14,
    right: 12,
    bottom: 14,
    left: 12,
  };

  /**
   * The width the document must be laid out at.
   *
   * `page.pdf()` does not re-flow the page to the paper size — it prints
   * whatever the viewport laid out and crops the overflow. Puppeteer's default
   * viewport is 800px while A4 minus these margins is 703px, so a full-width
   * four-column grid lays out at 800 and loses its fourth column off the right
   * edge, silently and only in the PDF.
   */
  private static contentWidthPx(options: PdfRenderOptions = {}): number {
    const margin = options.marginMm ?? PdfService.MARGIN_MM;
    const pageWidth = options.landscape
      ? PdfService.PAGE_HEIGHT_MM
      : PdfService.PAGE_WIDTH_MM;
    const mm = pageWidth - margin.left - margin.right;

    return Math.floor((mm / 25.4) * 96);
  }

  async onModuleDestroy(): Promise<void> {
    await this.browser?.close().catch(() => undefined);
  }

  /** Resolves the browser binary, or explains precisely what is missing. */
  static executablePath(): string {
    const configured = process.env.PUPPETEER_EXECUTABLE_PATH;

    if (configured) {
      return configured;
    }

    const found = CANDIDATE_PATHS.find((path) => existsSync(path));

    if (!found) {
      throw new ServiceUnavailableException({
        status: 503,
        errors: {
          pdf:
            'chromiumNotFound: set PUPPETEER_EXECUTABLE_PATH, or install chromium ' +
            '(the API image does this via `apk add chromium`).',
        },
      });
    }

    return found;
  }

  /**
   * One browser for the process, relaunched if it dies.
   *
   * Launching Chromium costs about a second; a page costs milliseconds. The
   * promise is cached so two simultaneous first requests share one launch
   * rather than racing to start two browsers.
   */
  private async getBrowser(): Promise<Browser> {
    if (this.browser?.connected) {
      return this.browser;
    }

    if (!this.launching) {
      const puppeteer = await import('puppeteer-core');

      this.launching = puppeteer
        .launch({
          executablePath: PdfService.executablePath(),
          headless: true,
          // Chromium's sandbox needs kernel privileges a container does not
          // grant. The page we render is our own HTML, never user-navigated.
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
          ],
        })
        .then((browser) => {
          this.browser = browser;
          this.launching = undefined;

          return browser;
        })
        .catch((error: unknown) => {
          this.launching = undefined;
          throw error;
        });
    }

    return this.launching;
  }

  async render(html: string, options: PdfRenderOptions = {}): Promise<Buffer> {
    if (this.active >= PdfService.MAX_CONCURRENT) {
      throw new ServiceUnavailableException({
        status: 503,
        errors: { pdf: 'tooManyConcurrentExports' },
      });
    }

    this.active += 1;

    try {
      return await this.withTimeout(this.renderOnce(html, options));
    } finally {
      this.active -= 1;
    }
  }

  private async renderOnce(
    html: string,
    options: PdfRenderOptions,
  ): Promise<Buffer> {
    const browser = await this.getBrowser();
    const page = await browser.newPage();

    try {
      await page.setViewport({
        width: PdfService.contentWidthPx(options),
        height: 1_200,
        deviceScaleFactor: 1,
      });

      // `setContent` rather than a URL: the document is already in hand, and
      // navigating would mean serving it from somewhere first.
      await page.setContent(html, {
        waitUntil: 'load',
        timeout: PdfService.TIMEOUT_MS,
      });

      const { top, right, bottom, left } =
        options.marginMm ?? PdfService.MARGIN_MM;
      const pdf = await page.pdf({
        format: 'A4',
        landscape: options.landscape ?? false,
        printBackground: true,
        margin: {
          top: `${top}mm`,
          right: `${right}mm`,
          bottom: `${bottom}mm`,
          left: `${left}mm`,
        },
      });

      return Buffer.from(pdf);
    } finally {
      await page.close().catch(() => undefined);
    }
  }

  private async withTimeout<T>(work: Promise<T>): Promise<T> {
    let timer: NodeJS.Timeout | undefined;

    try {
      return await Promise.race([
        work,
        new Promise<never>((_, reject) => {
          timer = setTimeout(
            () =>
              reject(
                new GatewayTimeoutException({
                  status: 504,
                  errors: { pdf: 'renderTimedOut' },
                }),
              ),
            PdfService.TIMEOUT_MS,
          );
        }),
      ]);
    } catch (error) {
      this.logger.warn(
        `PDF render failed: ${error instanceof Error ? error.message : error}`,
      );
      throw error;
    } finally {
      if (timer) {
        clearTimeout(timer);
      }
    }
  }
}
