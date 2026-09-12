import { describe, expect, it, beforeEach, jest } from '@jest/globals';
import { MasterDataCodesService } from './master-data-codes.service';

/**
 * Epic 6 regression: a partial update must not clobber the translation
 * columns with `undefined`.
 *
 * `MasterDataCodeRelationalRepository.update` merges `{ ...toDomain(row),
 * ...payload }`, so an explicitly-undefined key in the payload wins over the
 * stored value. `toPersistence` then coerces it to `{}` and Postgres rejects
 * the row via CK_master_data_code_name_has_default_locale.
 */
describe('MasterDataCodesService — partial updates', () => {
  let service: MasterDataCodesService;
  let repository: { update: jest.Mock<any> };

  beforeEach(() => {
    repository = {
      update: (jest.fn() as jest.Mock<any>).mockResolvedValue({ id: 'code-1' }),
    };

    service = new MasterDataCodesService(
      { findById: jest.fn() } as any,
      { findById: jest.fn() } as any,
      repository as any,
    );
  });

  it('should not send undefined translation keys when they were not supplied', async () => {
    await service.update('code-1', { displayOrder: 9 } as any);

    const payload = repository.update.mock.calls[0][1] as Record<
      string,
      unknown
    >;

    expect(payload.displayOrder).toBe(9);
    expect('nameTranslations' in payload).toBe(false);
    expect('descriptionTranslations' in payload).toBe(false);
  });

  it('should forward translations when they are supplied', async () => {
    await service.update('code-1', {
      nameTranslations: { vi: 'Cơ bản' },
    } as any);

    expect(repository.update).toHaveBeenCalledWith(
      'code-1',
      expect.objectContaining({ nameTranslations: { vi: 'Cơ bản' } }),
    );
  });

  it('should drop every other unsupplied key too', async () => {
    await service.update('code-1', { isActive: false } as any);

    const payload = repository.update.mock.calls[0][1] as Record<
      string,
      unknown
    >;

    expect(payload).toEqual({ isActive: false });
  });
});
