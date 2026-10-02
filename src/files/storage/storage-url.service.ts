import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AllConfigType } from '../../config/config.type';
import { AppConfig } from '../../config/app-config.type';
import appConfig from '../../config/app.config';
import { FileConfig } from '../config/file-config.type';
import fileConfig from '../config/file.config';
import {
  StoredFileRef,
  createPresignGet,
  resolveFileUrl,
  stableUrlOf,
} from './storage-url';

const presignGetFor = createPresignGet();

/**
 * Turns stored files into URLs, per file: each row carries its own bucket and
 * visibility, so a public thumbnail and a private lecture document resolve
 * differently under the same configuration.
 */
@Injectable()
export class StorageUrlService {
  constructor(private readonly configService: ConfigService<AllConfigType>) {}

  private get fileConfig(): FileConfig {
    return this.configService.getOrThrow('file', { infer: true });
  }

  private get backendDomain(): string {
    return this.configService.getOrThrow('app.backendDomain', { infer: true });
  }

  /** A URL to read `ref` now. May be presigned, and then it expires. */
  urlFor(ref: StoredFileRef): Promise<string> {
    const config = this.fileConfig;

    return resolveFileUrl(
      config,
      this.backendDomain,
      presignGetFor(config),
      ref,
    );
  }

  /**
   * A URL for `ref` that never expires, or `null` when the file can only be
   * reached through a presigned URL. Use it before storing a URL anywhere.
   */
  stableUrlFor(ref: StoredFileRef): string | null {
    return stableUrlOf(this.fileConfig, this.backendDomain, ref);
  }
}

/**
 * {@link StorageUrlService.urlFor} for code that runs outside the DI
 * container — the `path` transform on `FileType`, which class-transformer
 * calls while serializing a response.
 */
export const resolveFileUrlFromEnv = (ref: StoredFileRef): Promise<string> => {
  const config = fileConfig() as FileConfig;

  return resolveFileUrl(
    config,
    (appConfig() as AppConfig).backendDomain,
    presignGetFor(config),
    ref,
  );
};
