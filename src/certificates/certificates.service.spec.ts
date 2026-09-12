import { describe, expect, it, beforeEach, jest } from '@jest/globals';
import { CertificatesService } from './certificates.service';

describe('CertificatesService', () => {
  let service: CertificatesService;
  let repository: Record<string, jest.Mock<any>>;

  beforeEach(() => {
    repository = {
      update: (jest.fn() as jest.Mock<any>).mockResolvedValue({ id: 'c-1' }),
    };

    service = new CertificatesService(
      { findById: jest.fn() } as never, // media files
      { findById: jest.fn() } as never, // courses
      { findById: jest.fn() } as never, // users
      { findById: jest.fn() } as never, // enrollments
      repository as never,
    );
  });

  /**
   * The repository merges `{ ...current, ...payload }`, so any key the patch
   * carries as undefined silently erases the stored value — including the
   * certificate number and the course/student/enrollment links.
   */
  it('should not send keys the patch omits', async () => {
    await service.update('c-1', { studentNameSnapshot: 'New Name' } as never);

    const [, payload] = repository.update.mock.calls[0] as [
      string,
      Record<string, unknown>,
    ];

    expect(payload).toEqual({ studentNameSnapshot: 'New Name' });
    expect(Object.keys(payload)).not.toContain('certificateNumber');
    expect(Object.keys(payload)).not.toContain('course');
  });

  it('should still forward an explicit null', async () => {
    await service.update('c-1', { file: null } as never);

    const [, payload] = repository.update.mock.calls[0] as [
      string,
      Record<string, unknown>,
    ];

    expect(payload).toEqual({ file: null });
  });
});
