/**
 * What may be uploaded, for every storage driver.
 *
 * The drivers had drifted apart: `local`, `s3` and `s3-presigned` accepted
 * only `jpg|jpeg|png|gif`, while `r2` already allowed WebP, AVIF, SVG and PDF.
 * So the same upload succeeded or failed depending on `FILE_DRIVER` — a PDF
 * lecture could be authored against r2 and not against a local dev setup,
 * which is where this was found.
 *
 * **SVG is deliberately absent.** It is a document format: an `<svg>` can
 * carry `<script>`, and these files are served from the API's own origin.
 * r2 accepted it before this list existed; that is tightened here rather than
 * spread to three more drivers.
 */
export const ALLOWED_FILE_EXTENSIONS = /\.(jpg|jpeg|png|gif|webp|avif|pdf)$/i;

/**
 * The content types each extension may claim.
 *
 * The extension alone decides how the file is later *served* (`sendFile`
 * infers it), so a mismatch between the two is how a script gets served as an
 * image. Browsers are not consistent about JPEG, hence the aliases.
 */
const MIME_BY_EXTENSION: Record<string, readonly string[]> = {
  jpg: ['image/jpeg', 'image/jpg', 'image/pjpeg'],
  jpeg: ['image/jpeg', 'image/jpg', 'image/pjpeg'],
  png: ['image/png'],
  gif: ['image/gif'],
  webp: ['image/webp'],
  avif: ['image/avif'],
  pdf: ['application/pdf'],
};

const extensionOf = (name: string): string =>
  name.split('.').pop()?.toLowerCase() ?? '';

/**
 * `mimeType` is what the client claimed. It is checked when present and
 * recognised; an unknown or absent value does not veto an allowed extension,
 * because some clients send `application/octet-stream` for a perfectly good
 * PDF and refusing those would be a worse bug than the one this prevents.
 */
export const isAllowedUpload = (
  originalName: string,
  mimeType?: string,
): boolean => {
  if (!ALLOWED_FILE_EXTENSIONS.test(originalName)) {
    return false;
  }

  const claimed = mimeType?.split(';')[0]?.trim().toLowerCase();

  if (!claimed || claimed === 'application/octet-stream') {
    return true;
  }

  const allowed = MIME_BY_EXTENSION[extensionOf(originalName)];

  return !allowed || allowed.includes(claimed);
};
