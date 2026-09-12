import { describe, expect, it } from '@jest/globals';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { FindCoursesCatalogDto } from './find-courses-catalog.dto';

const UUID_A = '11111111-1111-4111-8111-111111111111';
const UUID_B = '22222222-2222-4222-8222-222222222222';

const parse = (query: Record<string, unknown>) =>
  plainToInstance(FindCoursesCatalogDto, query, {
    enableImplicitConversion: false,
  });

const errorsFor = (query: Record<string, unknown>) =>
  validateSync(parse(query), { whitelist: true, forbidUnknownValues: false });

const propertiesInError = (query: Record<string, unknown>) =>
  errorsFor(query).map((error) => error.property);

/**
 * Epic 4.4 §1.2 — the plural filter params.
 *
 * The DTO is the whole defence here. The global `ValidationPipe` runs with
 * `whitelist: true`, so a param the DTO does not declare is **stripped
 * silently and answered 200** — which is exactly how `groupIds` would appear
 * to "work" while filtering nothing at all. Every case below is a way that
 * could happen without anyone noticing.
 */
describe('FindCoursesCatalogDto', () => {
  describe('plural id filters', () => {
    it.each([['groupIds'], ['categoryIds'], ['levelIds'], ['instructorIds']])(
      'should accept %s as a CSV of uuids',
      (param) => {
        const dto = parse({ [param]: `${UUID_A},${UUID_B}` });

        expect(dto[param]).toEqual([UUID_A, UUID_B]);
        expect(propertiesInError({ [param]: `${UUID_A},${UUID_B}` })).toEqual(
          [],
        );
      },
    );

    it.each([['groupIds'], ['categoryIds'], ['levelIds'], ['instructorIds']])(
      'should accept %s as a repeated query param',
      (param) => {
        expect(parse({ [param]: [UUID_A, UUID_B] })[param]).toEqual([
          UUID_A,
          UUID_B,
        ]);
      },
    );

    it('should treat an empty plural param as no filter, not as an empty set', () => {
      expect(parse({ groupIds: '' }).groupIds).toBeUndefined();
      expect(propertiesInError({ groupIds: '' })).toEqual([]);
    });

    it('should reject a non-uuid inside the list rather than drop it', () => {
      expect(propertiesInError({ groupIds: `${UUID_A},not-a-uuid` })).toEqual([
        'groupIds',
      ]);
    });

    it('should reject a plural param that is not a uuid at all', () => {
      expect(propertiesInError({ levelIds: '42' })).toEqual(['levelIds']);
    });
  });

  describe('deprecated singular aliases (§1.2 migration)', () => {
    it.each([['groupId'], ['categoryId'], ['levelId'], ['instructorId']])(
      'should still accept %s',
      (param) => {
        expect(parse({ [param]: UUID_A })[param]).toBe(UUID_A);
        expect(propertiesInError({ [param]: UUID_A })).toEqual([]);
      },
    );

    it('should still reject a malformed singular value', () => {
      expect(propertiesInError({ groupId: 'nope' })).toEqual(['groupId']);
    });
  });

  describe('sortBy', () => {
    it('should accept relevance (§1.5)', () => {
      expect(propertiesInError({ sortBy: 'relevance' })).toEqual([]);
    });

    it('should still accept the five original sorts', () => {
      for (const sortBy of [
        'newest',
        'most_popular',
        'highest_rated',
        'shortest',
        'longest',
      ]) {
        expect(propertiesInError({ sortBy })).toEqual([]);
      }
    });

    it('should reject an unknown sort', () => {
      expect(propertiesInError({ sortBy: 'cheapest' })).toEqual(['sortBy']);
    });

    it('should leave sortBy absent when it was not sent, so the server can default it', () => {
      // AC-2e depends on this: the header search must not carry a sortBy, and
      // an eagerly-defaulted 'newest' here would throw the ranking away.
      expect(parse({ search: 'dna' }).sortBy).toBeUndefined();
    });
  });

  describe('search', () => {
    it('should trim the term', () => {
      expect(parse({ search: '  khoa hoc  ' }).search).toBe('khoa hoc');
    });

    /** AC-2f — hostile input is the DTO's problem before it is Postgres'. */
    it.each([['c++ ('], ['"'], ['-"a b"'], ["'; DROP TABLE course; --"]])(
      'should accept %j as a plain string',
      (search) => {
        expect(propertiesInError({ search })).toEqual([]);
      },
    );
  });

  describe('the falsy trap', () => {
    it('should keep isFree=false distinct from isFree absent', () => {
      expect(parse({ isFree: 'false' }).isFree).toBe(false);
      expect(parse({}).isFree).toBeUndefined();
    });
  });
});
