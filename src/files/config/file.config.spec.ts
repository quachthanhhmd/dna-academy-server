import { afterEach, describe, expect, it } from '@jest/globals';
import fileConfig from './file.config';
import { FileConfig } from './file-config.type';

describe('fileConfig', () => {
  const original = { ...process.env };

  afterEach(() => {
    process.env = { ...original };
  });

  const load = () => (fileConfig as unknown as () => FileConfig)();

  const r2Env = (env: Record<string, string>) => {
    for (const key of [
      'R2_BUCKET',
      'R2_BUCKET_PUBLIC',
      'R2_BUCKET_PRIVATE',
      'R2_PUBLIC_URL',
      'FILE_PRESIGNED_GET_TTL',
    ]) {
      delete process.env[key];
    }

    Object.assign(process.env, {
      FILE_DRIVER: 'r2',
      R2_ACCOUNT_ID: 'acc',
      R2_ACCESS_KEY_ID: 'key',
      R2_SECRET_ACCESS_KEY: 'secret',
      ...env,
    });
  };

  // An environment configured before the split has to keep booting, with
  // every upload going where it went before.
  it('should fall back to R2_BUCKET for both buckets', () => {
    r2Env({ R2_BUCKET: 'only' });

    expect(load()).toMatchObject({
      r2Bucket: 'only',
      r2PublicBucket: 'only',
      r2PrivateBucket: 'only',
    });
  });

  it('should use the split buckets when both are set', () => {
    r2Env({
      R2_BUCKET_PUBLIC: 'pub',
      R2_BUCKET_PRIVATE: 'priv',
    });

    expect(load()).toMatchObject({
      r2Bucket: 'pub',
      r2PublicBucket: 'pub',
      r2PrivateBucket: 'priv',
    });
  });

  it('should keep R2_BUCKET as the legacy bucket next to the split ones', () => {
    r2Env({
      R2_BUCKET: 'old',
      R2_BUCKET_PUBLIC: 'pub',
      R2_BUCKET_PRIVATE: 'priv',
    });

    expect(load()).toMatchObject({ r2Bucket: 'old' });
  });

  it('should require R2_BUCKET while one split bucket is missing', () => {
    r2Env({ R2_BUCKET_PUBLIC: 'pub' });

    expect(load).toThrow();
  });

  // env-cmd passes an unset key through as an empty string.
  it('should treat a blank split bucket as unset', () => {
    r2Env({ R2_BUCKET: 'only', R2_BUCKET_PRIVATE: '' });

    expect(load()).toMatchObject({ r2PrivateBucket: 'only' });
  });

  it('should default the presigned GET lifetime to ten minutes', () => {
    r2Env({ R2_BUCKET: 'only' });

    expect(load().presignedGetTtlSeconds).toBe(600);
  });

  it('should reject a presigned GET lifetime outside one minute to one hour', () => {
    r2Env({ R2_BUCKET: 'only', FILE_PRESIGNED_GET_TTL: '86400' });
    expect(load).toThrow();

    r2Env({ R2_BUCKET: 'only', FILE_PRESIGNED_GET_TTL: '5' });
    expect(load).toThrow();
  });

  it('should read a presigned GET lifetime within bounds', () => {
    r2Env({ R2_BUCKET: 'only', FILE_PRESIGNED_GET_TTL: '300' });

    expect(load().presignedGetTtlSeconds).toBe(300);
  });
});
