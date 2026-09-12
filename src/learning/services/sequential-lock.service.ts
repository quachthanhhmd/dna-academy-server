import { ForbiddenException, HttpStatus, Injectable } from '@nestjs/common';

export const LOCK_REASON_PREVIOUS_INCOMPLETE = 'PREVIOUS_LECTURE_INCOMPLETE';

export type LockEvaluation = {
  isLocked: boolean;
  lockReason: string | null;
  /** The lecture the student must finish first, when locked. */
  requiredLectureId: string | null;
};

const UNLOCKED: LockEvaluation = {
  isLocked: false,
  lockReason: null,
  requiredLectureId: null,
};

/**
 * Epic 4 v2 §2.4 — sequential completion.
 *
 * A lecture is locked when the course requires sequential completion and the
 * nearest *required* lecture before it has not been completed. Lectures with
 * `requiresCompletion = false` are optional: they neither lock themselves nor
 * block what follows them.
 */
@Injectable()
export class SequentialLockService {
  evaluate(
    requiresSequentialCompletion: boolean,
    orderedLectures: { id: string; requiresCompletion: boolean }[],
    lectureId: string,
    progressStatusByLectureId: Map<string, string>,
  ): LockEvaluation {
    if (!requiresSequentialCompletion) {
      return UNLOCKED;
    }

    const index = orderedLectures.findIndex((item) => item.id === lectureId);

    // A lecture outside this course is a 404 concern, not a lock concern.
    if (index <= 0) {
      return UNLOCKED;
    }

    // Walk backwards to the nearest required predecessor that is not done, so
    // the message names the lecture the student should actually open next.
    for (let i = index - 1; i >= 0; i -= 1) {
      const previous = orderedLectures[i];

      if (!previous.requiresCompletion) {
        continue;
      }

      if (progressStatusByLectureId.get(previous.id) !== 'completed') {
        return {
          isLocked: true,
          lockReason: LOCK_REASON_PREVIOUS_INCOMPLETE,
          requiredLectureId: previous.id,
        };
      }

      // The nearest required predecessor is complete — everything before it
      // must already be complete too, so stop here.
      return UNLOCKED;
    }

    return UNLOCKED;
  }

  assertUnlocked(
    requiresSequentialCompletion: boolean,
    orderedLectures: { id: string; requiresCompletion: boolean }[],
    lectureId: string,
    progressStatusByLectureId: Map<string, string>,
  ): void {
    const evaluation = this.evaluate(
      requiresSequentialCompletion,
      orderedLectures,
      lectureId,
      progressStatusByLectureId,
    );

    if (evaluation.isLocked) {
      throw new ForbiddenException({
        status: HttpStatus.FORBIDDEN,
        code: evaluation.lockReason,
        requiredLectureId: evaluation.requiredLectureId,
      });
    }
  }
}
