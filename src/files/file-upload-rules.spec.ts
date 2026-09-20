import { describe, expect, it } from '@jest/globals';
import { isAllowedUpload } from './file-upload-rules';

/**
 * The drivers had drifted: a PDF lecture could be authored against r2 and not
 * against a local dev setup, because only r2 allowed PDFs.
 */
describe('isAllowedUpload', () => {
  describe('the types the admin actually uploads', () => {
    it.each([
      ['thumbnail.jpg', 'image/jpeg'],
      ['thumbnail.jpeg', 'image/jpeg'],
      ['diagram.png', 'image/png'],
      ['loop.gif', 'image/gif'],
      ['hero.webp', 'image/webp'],
      ['hero.avif', 'image/avif'],
      ['bai-giang.pdf', 'application/pdf'],
    ])('should accept %s', (name, mime) => {
      expect(isAllowedUpload(name, mime)).toBe(true);
    });

    it('should accept an uppercase extension', () => {
      expect(isAllowedUpload('SLIDES.PDF', 'application/pdf')).toBe(true);
    });

    it('should accept a Vietnamese file name', () => {
      expect(isAllowedUpload('Bài giảng số 1.pdf', 'application/pdf')).toBe(
        true,
      );
    });
  });

  describe('what stays out', () => {
    it.each(['notes.txt', 'archive.zip', 'macro.docx', 'script.js'])(
      'should reject %s',
      (name) => {
        expect(isAllowedUpload(name, 'application/octet-stream')).toBe(false);
      },
    );

    // An <svg> can carry <script>, and these files are served from the API's
    // own origin. r2 allowed it before the list was shared; that is tightened.
    it('should reject SVG', () => {
      expect(isAllowedUpload('logo.svg', 'image/svg+xml')).toBe(false);
    });

    it('should reject a file with no extension', () => {
      expect(isAllowedUpload('README', 'text/plain')).toBe(false);
    });

    it('should reject an extension hidden mid-name', () => {
      expect(isAllowedUpload('invoice.pdf.exe', 'application/pdf')).toBe(false);
    });
  });

  describe('the declared content type', () => {
    it('should reject a PDF claiming to be an image', () => {
      expect(isAllowedUpload('payload.pdf', 'image/png')).toBe(false);
    });

    it('should reject an image claiming to be a PDF', () => {
      expect(isAllowedUpload('photo.png', 'application/pdf')).toBe(false);
    });

    it('should accept the JPEG aliases browsers send', () => {
      expect(isAllowedUpload('photo.jpg', 'image/jpg')).toBe(true);
      expect(isAllowedUpload('photo.jpg', 'image/pjpeg')).toBe(true);
    });

    it('should ignore charset parameters', () => {
      expect(
        isAllowedUpload('doc.pdf', 'application/pdf; charset=binary'),
      ).toBe(true);
    });

    /*
      Some clients send a generic type for a perfectly good PDF. Refusing
      those would be a worse bug than the one the check prevents, so the
      extension decides and an unknown claim does not veto it.
    */
    it('should accept a generic octet-stream for an allowed extension', () => {
      expect(isAllowedUpload('slides.pdf', 'application/octet-stream')).toBe(
        true,
      );
    });

    it('should accept when no content type is given at all', () => {
      expect(isAllowedUpload('slides.pdf')).toBe(true);
    });
  });
});
