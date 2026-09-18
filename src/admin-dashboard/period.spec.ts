import { describe, expect, it } from '@jest/globals';
import {
  bucketKeys,
  granularityFor,
  previousPeriod,
  resolvePeriod,
  spanInDays,
} from './period';

/**
 * Epic 7 D6/BE-1. Every case here is expressed in Vietnam time, because that
 * is what the dashboard claims a "day" is.
 */
describe('dashboard period resolution', () => {
  // 13/09/2026 09:12 Vietnam time.
  const now = new Date('2026-09-13T02:12:00Z');

  describe('rolling windows', () => {
    it('should treat 7d as today plus the six days before it', () => {
      const period = resolvePeriod('7d', undefined, undefined, now);

      expect(period.fromLabel).toBe('2026-09-07T00:00:00+07:00');
      expect(period.toLabel).toBe('2026-09-13T23:59:59+07:00');
      expect(spanInDays(period)).toBe(7);
    });

    it('should resolve 30d to the window the spec prints in meta', () => {
      const period = resolvePeriod('30d', undefined, undefined, now);

      expect(period.fromLabel).toBe('2026-08-15T00:00:00+07:00');
      expect(period.toLabel).toBe('2026-09-13T23:59:59+07:00');
    });

    it('should start the window at 17:00Z the day before, not midnight UTC', () => {
      // The whole point of D6: a Vietnam day begins at 17:00Z.
      const period = resolvePeriod('7d', undefined, undefined, now);

      expect(period.from.toISOString()).toBe('2026-09-06T17:00:00.000Z');
      expect(period.toExclusive.toISOString()).toBe('2026-09-13T17:00:00.000Z');
    });

    it('should end the window half-open so 23:59:59.999 is inside it', () => {
      const period = resolvePeriod('30d', undefined, undefined, now);
      const lastMoment = new Date('2026-09-13T16:59:59.999Z');

      expect(lastMoment.getTime()).toBeLessThan(period.toExclusive.getTime());
    });
  });

  describe('calendar windows', () => {
    it('should resolve quarter to the calendar quarter so far', () => {
      const period = resolvePeriod('quarter', undefined, undefined, now);

      expect(period.fromLabel).toBe('2026-07-01T00:00:00+07:00');
      expect(period.toLabel).toBe('2026-09-13T23:59:59+07:00');
    });

    it('should resolve year to the calendar year so far', () => {
      const period = resolvePeriod('year', undefined, undefined, now);

      expect(period.fromLabel).toBe('2026-01-01T00:00:00+07:00');
    });

    it('should use the Vietnam date when UTC is still on the previous day', () => {
      // 01/07 00:30 Vietnam = 30/06 17:30 UTC. The quarter has already turned.
      const justAfterMidnight = new Date('2026-06-30T17:30:00Z');
      const period = resolvePeriod(
        'quarter',
        undefined,
        undefined,
        justAfterMidnight,
      );

      expect(period.fromLabel).toBe('2026-07-01T00:00:00+07:00');
    });
  });

  describe('custom windows', () => {
    it('should include both ends of the range', () => {
      const period = resolvePeriod('custom', '2026-08-15', '2026-09-13', now);

      expect(period.fromLabel).toBe('2026-08-15T00:00:00+07:00');
      expect(period.toLabel).toBe('2026-09-13T23:59:59+07:00');
      expect(spanInDays(period)).toBe(30);
    });

    it('should accept a single-day range', () => {
      const period = resolvePeriod('custom', '2026-09-13', '2026-09-13', now);

      expect(spanInDays(period)).toBe(1);
      expect(period.granularity).toBe('day');
    });

    it('should reject a custom period with no dates', () => {
      expect(() =>
        resolvePeriod('custom', undefined, undefined, now),
      ).toThrow();
    });

    it('should reject a malformed date', () => {
      expect(() =>
        resolvePeriod('custom', '15/08/2026', '2026-09-13', now),
      ).toThrow();
    });

    it('should reject a date that is not on the calendar', () => {
      expect(() =>
        resolvePeriod('custom', '2026-02-31', '2026-09-13', now),
      ).toThrow();
    });

    it('should reject a range that runs backwards', () => {
      expect(() =>
        resolvePeriod('custom', '2026-09-13', '2026-08-15', now),
      ).toThrow();
    });
  });

  describe('granularity', () => {
    it('should bucket short rolling windows by day', () => {
      expect(granularityFor('7d', 7)).toBe('day');
      expect(granularityFor('30d', 30)).toBe('day');
    });

    it('should bucket quarter-length windows by week', () => {
      expect(granularityFor('90d', 90)).toBe('week');
      expect(granularityFor('quarter', 74)).toBe('week');
    });

    it('should bucket a year by month', () => {
      expect(granularityFor('year', 256)).toBe('month');
    });

    it('should pick custom granularity from the span', () => {
      expect(granularityFor('custom', 31)).toBe('day');
      expect(granularityFor('custom', 32)).toBe('week');
      expect(granularityFor('custom', 180)).toBe('week');
      expect(granularityFor('custom', 181)).toBe('month');
    });
  });

  describe('previous period', () => {
    it('should be the same length and immediately before', () => {
      const period = resolvePeriod('30d', undefined, undefined, now);
      const previous = previousPeriod(period);

      expect(spanInDays(previous)).toBe(spanInDays(period));
      expect(previous.toExclusive.getTime()).toBe(period.from.getTime());
      expect(previous.fromLabel).toBe('2026-07-16T00:00:00+07:00');
      expect(previous.toLabel).toBe('2026-08-14T23:59:59+07:00');
    });

    it('should not overlap the current period by even a millisecond', () => {
      const period = resolvePeriod('7d', undefined, undefined, now);
      const previous = previousPeriod(period);

      expect(previous.toExclusive.getTime()).toBeLessThanOrEqual(
        period.from.getTime(),
      );
    });
  });
});

describe('bucket axis', () => {
  const now = new Date('2026-09-13T02:12:00Z');

  it('should emit one key per day across a 7d window', () => {
    const keys = bucketKeys(resolvePeriod('7d', undefined, undefined, now));

    expect(keys).toEqual([
      '2026-09-07',
      '2026-09-08',
      '2026-09-09',
      '2026-09-10',
      '2026-09-11',
      '2026-09-12',
      '2026-09-13',
    ]);
  });

  it('should start a week bucket on the Monday that Postgres truncates to', () => {
    // 01/07/2026 is a Wednesday; its week starts Monday 29/06.
    const keys = bucketKeys(
      resolvePeriod('quarter', undefined, undefined, now),
    );

    expect(keys[0]).toBe('2026-06-29');
    expect(keys[1]).toBe('2026-07-06');
  });

  it('should emit month keys for a year', () => {
    const keys = bucketKeys(resolvePeriod('year', undefined, undefined, now));

    expect(keys[0]).toBe('2026-01');
    expect(keys).toHaveLength(9);
  });

  it('should cover a custom window end to end', () => {
    const keys = bucketKeys(
      resolvePeriod('custom', '2026-09-11', '2026-09-13', now),
    );

    expect(keys).toEqual(['2026-09-11', '2026-09-12', '2026-09-13']);
  });
});
