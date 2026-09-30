import { describe, expect, it } from '@jest/globals';
import {
  keyFromPublicUrl,
  planDocuments,
  planThumbnails,
  privateDocumentKey,
} from './storage-backfill-plan';

const BASES = ['https://cdn.example.com', 'https://pub-abc.r2.dev/'];

describe('keyFromPublicUrl', () => {
  it('should read the key behind the current public URL', () => {
    expect(keyFromPublicUrl('https://cdn.example.com/abc.pdf', BASES)).toBe(
      'abc.pdf',
    );
  });

  it('should read the key behind an earlier public URL', () => {
    expect(
      keyFromPublicUrl('https://pub-abc.r2.dev/uploads/x.png', BASES),
    ).toBe('uploads/x.png');
  });

  it('should decode the key and drop any query string', () => {
    expect(
      keyFromPublicUrl('https://cdn.example.com/B%C3%A0i%201.pdf?v=2', BASES),
    ).toBe('Bài 1.pdf');
  });

  // A base without a trailing slash must not swallow a longer host.
  it('should not match a different host that shares the prefix', () => {
    expect(
      keyFromPublicUrl('https://cdn.example.com.evil.io/a.pdf', BASES),
    ).toBeNull();
  });

  it('should leave external and empty URLs alone', () => {
    expect(keyFromPublicUrl('https://drive.google.com/x', BASES)).toBeNull();
    expect(keyFromPublicUrl(null, BASES)).toBeNull();
    expect(keyFromPublicUrl('https://cdn.example.com/', BASES)).toBeNull();
  });
});

describe('privateDocumentKey', () => {
  it('should keep the file name under the lecture-documents prefix', () => {
    expect(privateDocumentKey('abc.pdf')).toBe('lecture-documents/abc.pdf');
    expect(privateDocumentKey('uploads/abc.pdf')).toBe(
      'lecture-documents/abc.pdf',
    );
  });
});

describe('planDocuments', () => {
  it('should move a document served from the public bucket', () => {
    expect(
      planDocuments(
        [{ id: 'd1', fileUrl: 'https://cdn.example.com/abc.pdf' }],
        [{ id: 'm1', objectKey: 'abc.pdf', bucket: 'legacy' }],
        BASES,
      ),
    ).toEqual([
      {
        action: 'move',
        documentId: 'd1',
        sourceKey: 'abc.pdf',
        targetKey: 'lecture-documents/abc.pdf',
        mediaId: 'm1',
      },
    ]);
  });

  it('should plan a new media row when the upload was never recorded', () => {
    const [plan] = planDocuments(
      [{ id: 'd1', fileUrl: 'https://cdn.example.com/abc.pdf' }],
      [],
      BASES,
    );

    expect(plan).toMatchObject({ action: 'move', mediaId: null });
  });

  it('should skip a document hosted elsewhere', () => {
    const [plan] = planDocuments(
      [{ id: 'd1', fileUrl: 'https://drive.google.com/x' }],
      [],
      BASES,
    );

    expect(plan).toMatchObject({ action: 'skip', documentId: 'd1' });
  });
});

describe('planThumbnails', () => {
  it('should link a thumbnail to the row of its object', () => {
    expect(
      planThumbnails(
        [{ id: 'c1', thumbnailUrl: 'https://cdn.example.com/t.webp' }],
        [{ id: 'm2', objectKey: 't.webp', bucket: 'legacy' }],
        BASES,
      ),
    ).toEqual([
      { action: 'link', courseId: 'c1', key: 't.webp', mediaId: 'm2' },
    ]);
  });

  it('should skip a course without a thumbnail', () => {
    const [plan] = planThumbnails(
      [{ id: 'c1', thumbnailUrl: null }],
      [],
      BASES,
    );

    expect(plan).toMatchObject({ action: 'skip', reason: 'no URL' });
  });
});
