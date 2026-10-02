import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  Type,
  mixin,
} from '@nestjs/common';
import { ApiQuery } from '@nestjs/swagger';
import { Observable } from 'rxjs';
import {
  CLIENT_SELECTABLE_PURPOSES,
  FilePurpose,
  FileVisibility,
  parseClientPurpose,
  purposeRule,
} from './file-purpose';

const UPLOAD_PURPOSE = Symbol('uploadPurpose');

type RequestWithPurpose = {
  [UPLOAD_PURPOSE]?: FilePurpose;
  query?: Record<string, unknown>;
};

/**
 * The purpose of the upload in flight. A route that fixes its own purpose
 * ({@link UploadPurposeInterceptor}) wins; otherwise the client's
 * `?purpose=` query parameter, validated.
 *
 * Read from the request rather than the body because the storage engines
 * pick the bucket while the bytes stream in — a multipart field that arrives
 * after the file would be read too late.
 */
export const uploadPurposeOf = (request: unknown): FilePurpose => {
  const req = request as RequestWithPurpose;

  return req[UPLOAD_PURPOSE] ?? parseClientPurpose(req.query?.purpose);
};

/**
 * Fixes the purpose of every upload on a route. Must come before
 * `FileInterceptor` in `@UseInterceptors(...)`, so it is set before multer
 * starts storing.
 */
export const UploadPurposeInterceptor = (
  purpose: FilePurpose,
): Type<NestInterceptor> => {
  @Injectable()
  class MixinUploadPurposeInterceptor implements NestInterceptor {
    intercept(
      context: ExecutionContext,
      next: CallHandler,
    ): Observable<unknown> {
      context.switchToHttp().getRequest<RequestWithPurpose>()[UPLOAD_PURPOSE] =
        purpose;

      return next.handle();
    }
  }

  return mixin(MixinUploadPurposeInterceptor);
};

/** Swagger for the `?purpose=` parameter of `POST /files/upload`. */
export const ApiUploadPurposeQuery = () =>
  ApiQuery({
    name: 'purpose',
    required: false,
    enum: CLIENT_SELECTABLE_PURPOSES,
    description:
      'What the file is for. Decides where it is stored and who can read it: ' +
      '`lecture-document` is private (served only through short-lived presigned URLs — ' +
      'reference it by `file.id`, never store `file.path`); the others are public. ' +
      'Defaults to `upload` (public).',
  });

export const visibilityOf = (purpose: FilePurpose): FileVisibility =>
  purposeRule(purpose).visibility;
