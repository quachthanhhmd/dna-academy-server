import { Injectable } from '@nestjs/common';
import { SectionsService } from '../../sections/sections.service';
import { LecturesService } from '../../lectures/lectures.service';
import { Lecture } from '../../lectures/domain/lecture';
import { Section } from '../../sections/domain/section';
import { Course } from '../../courses/domain/course';

/** A lecture in course order, carrying the section it belongs to. */
export type CurriculumLecture = Lecture & { section: Section };

/**
 * The course's lectures flattened into a single reading order:
 * sections by displayOrder, then lectures by displayOrder inside each.
 *
 * Everything that needs "what comes before / after this lecture" — the
 * sequential lock, prev/next navigation, progress percentage — works off this
 * one ordering so they can never disagree.
 */
@Injectable()
export class CourseCurriculumService {
  constructor(
    private readonly sectionsService: SectionsService,
    private readonly lecturesService: LecturesService,
  ) {}

  async orderedLectures(courseId: Course['id']): Promise<CurriculumLecture[]> {
    const sections = [
      ...(await this.sectionsService.findByCourseId(courseId)),
    ].sort((a, b) => a.displayOrder - b.displayOrder);

    const result: CurriculumLecture[] = [];

    for (const section of sections) {
      const lectures = [
        ...(await this.lecturesService.findBySectionId(section.id)),
      ].sort((a, b) => a.displayOrder - b.displayOrder);

      for (const lecture of lectures) {
        result.push({ ...lecture, section });
      }
    }

    return result;
  }

  static neighbours(
    ordered: { id: string }[],
    lectureId: string,
  ): { prevLectureId: string | null; nextLectureId: string | null } {
    const index = ordered.findIndex((item) => item.id === lectureId);

    if (index === -1) {
      return { prevLectureId: null, nextLectureId: null };
    }

    return {
      prevLectureId: ordered[index - 1]?.id ?? null,
      nextLectureId: ordered[index + 1]?.id ?? null,
    };
  }
}
