import { describe, expect, it, beforeEach } from '@jest/globals';
import { ForbiddenException } from '@nestjs/common';
import { SequentialLockService } from './sequential-lock.service';

describe('SequentialLockService', () => {
  let service: SequentialLockService;

  const lec = (id: string, requiresCompletion = true) =>
    ({ id, requiresCompletion }) as never;

  const ordered = [
    lec('a'),
    lec('b', false), // optional lecture
    lec('c'),
    lec('d'),
  ];

  beforeEach(() => {
    service = new SequentialLockService();
  });

  const completed = (...ids: string[]) =>
    new Map(ids.map((id) => [id, 'completed']));

  describe('when the course does not require sequential completion', () => {
    it('should never lock', () => {
      expect(service.evaluate(false, ordered, 'd', new Map())).toEqual({
        isLocked: false,
        lockReason: null,
        requiredLectureId: null,
      });
    });
  });

  describe('when sequential completion is on', () => {
    it('should leave the first lecture open', () => {
      expect(service.evaluate(true, ordered, 'a', new Map()).isLocked).toBe(
        false,
      );
    });

    it('should lock a lecture whose predecessor is incomplete', () => {
      const result = service.evaluate(true, ordered, 'c', new Map());

      expect(result).toEqual({
        isLocked: true,
        lockReason: 'PREVIOUS_LECTURE_INCOMPLETE',
        requiredLectureId: 'a',
      });
    });

    it('should unlock once the previous required lecture is completed', () => {
      expect(
        service.evaluate(true, ordered, 'c', completed('a')).isLocked,
      ).toBe(false);
    });

    it('should skip optional lectures when looking for the blocker', () => {
      // 'b' does not require completion, so 'c' is gated on 'a'.
      const result = service.evaluate(true, ordered, 'c', new Map());

      expect(result.requiredLectureId).toBe('a');
    });

    it('should report the nearest incomplete predecessor, not the first', () => {
      const result = service.evaluate(true, ordered, 'd', completed('a'));

      expect(result.requiredLectureId).toBe('c');
    });

    it('should treat an in-progress predecessor as incomplete', () => {
      const progress = new Map([['a', 'in_progress']]);

      expect(service.evaluate(true, ordered, 'c', progress).isLocked).toBe(
        true,
      );
    });

    it('should still gate an optional lecture on the order', () => {
      // `requiresCompletion` controls whether a lecture BLOCKS the ones after
      // it and whether it counts toward progress — it does not exempt the
      // lecture from the course's reading order.
      expect(service.evaluate(true, ordered, 'b', new Map())).toEqual({
        isLocked: true,
        lockReason: 'PREVIOUS_LECTURE_INCOMPLETE',
        requiredLectureId: 'a',
      });
    });

    it('should open an optional lecture once its predecessor is done', () => {
      expect(
        service.evaluate(true, ordered, 'b', completed('a')).isLocked,
      ).toBe(false);
    });

    it('should not lock a lecture that is not part of the course', () => {
      expect(
        service.evaluate(true, ordered, 'unknown', new Map()).isLocked,
      ).toBe(false);
    });
  });

  describe('assertUnlocked', () => {
    it('should throw 403 with the blocking lecture id', () => {
      expect(() =>
        service.assertUnlocked(true, ordered, 'c', new Map()),
      ).toThrow(ForbiddenException);

      try {
        service.assertUnlocked(true, ordered, 'c', new Map());
      } catch (error) {
        expect((error as ForbiddenException).getResponse()).toEqual({
          status: 403,
          code: 'PREVIOUS_LECTURE_INCOMPLETE',
          requiredLectureId: 'a',
        });
      }
    });

    it('should not throw when unlocked', () => {
      expect(() =>
        service.assertUnlocked(true, ordered, 'c', completed('a')),
      ).not.toThrow();
    });
  });
});
