import { Injectable } from '@nestjs/common';
import { SectionsService } from '../sections/sections.service';
import { LecturesService } from '../lectures/lectures.service';
import { CoursesService } from '../courses/courses.service';
import { Course } from '../courses/domain/course';

@Injectable()
export class CourseAggregatesService {
  constructor(
    private readonly sectionsService: SectionsService,
    private readonly lecturesService: LecturesService,
    private readonly coursesService: CoursesService,
  ) {}

  async recalculate(courseId: Course['id']): Promise<void> {
    const [totalSections, { totalLectures, totalDurationSecs }] =
      await Promise.all([
        this.sectionsService.countByCourseId(courseId),
        this.lecturesService.getCourseAggregates(courseId),
      ]);

    await this.coursesService.update(courseId, {
      totalSections,
      totalLectures,
      totalDurationSecs,
    });
  }
}
