import { describe, expect, it } from '@jest/globals';
import {
  QUIZ_UPLOAD_MAX_BYTES,
  QUIZ_UPLOAD_MULTER_OPTIONS,
} from './quiz-upload-multer.options';

describe('QUIZ_UPLOAD_MULTER_OPTIONS', () => {
  const filter = (originalname: string, mimetype: string) =>
    new Promise<{ error: unknown; accepted: unknown }>((resolve) => {
      QUIZ_UPLOAD_MULTER_OPTIONS.fileFilter!(
        {} as never,
        { originalname, mimetype } as never,
        ((error: unknown, accepted: unknown) =>
          resolve({ error, accepted })) as never,
      );
    });

  // The driver modules' own filter matches /\.(jpg|jpeg|png|gif)$/i and would
  // reject each of these before the handler runs. §2.4 moves that decision to
  // the service, which is the only layer that knows the question's rules.
  it.each([
    ['essay.pdf', 'application/pdf'],
    [
      'report.docx',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ],
    ['data.csv', 'text/csv'],
    ['archive.zip', 'application/zip'],
    ['no-extension', 'application/octet-stream'],
  ])('should accept %s at the multer layer', async (name, mime) => {
    await expect(filter(name, mime)).resolves.toEqual({
      error: null,
      accepted: true,
    });
  });

  it('should still accept the image types the old filter allowed', async () => {
    await expect(filter('photo.png', 'image/png')).resolves.toEqual({
      error: null,
      accepted: true,
    });
  });

  it('should cap a single upload at 50 MB', () => {
    expect(QUIZ_UPLOAD_MAX_BYTES).toBe(52428800);
    expect(QUIZ_UPLOAD_MULTER_OPTIONS.limits?.fileSize).toBe(
      QUIZ_UPLOAD_MAX_BYTES,
    );
  });

  it('should accept one file per request', () => {
    expect(QUIZ_UPLOAD_MULTER_OPTIONS.limits?.files).toBe(1);
  });
});
