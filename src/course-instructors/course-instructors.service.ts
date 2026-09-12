import { Injectable } from '@nestjs/common';
import { CourseInstructorRepository } from './infrastructure/persistence/course-instructor.repository';
import { CourseInstructor } from './domain/course-instructor';
import { DeepPartial } from '../utils/types/deep-partial.type';
import {
  InstructorRefDto,
  toInstructorRef,
} from '../instructors/dto/instructor-profile.dto';
import { Instructor } from '../instructors/domain/instructor';

export type CourseInstructorsView = {
  primaryInstructor: InstructorRefDto | null;
  coInstructors: InstructorRefDto[];
};

@Injectable()
export class CourseInstructorsService {
  constructor(
    private readonly courseInstructorRepository: CourseInstructorRepository,
  ) {}

  create(data: Omit<CourseInstructor, 'id' | 'createdAt' | 'updatedAt'>) {
    return this.courseInstructorRepository.create(data);
  }

  findById(id: CourseInstructor['id']) {
    return this.courseInstructorRepository.findById(id);
  }

  findByCourseId(courseId: string) {
    return this.courseInstructorRepository.findByCourseId(courseId);
  }

  findByCourseIds(courseIds: string[]) {
    return this.courseInstructorRepository.findByCourseIds(courseIds);
  }

  findByInstructorId(instructorId: string) {
    return this.courseInstructorRepository.findByInstructorId(instructorId);
  }

  countByInstructorId(instructorId: string) {
    return this.courseInstructorRepository.countByInstructorId(instructorId);
  }

  update(id: CourseInstructor['id'], payload: DeepPartial<CourseInstructor>) {
    return this.courseInstructorRepository.update(id, payload);
  }

  remove(id: CourseInstructor['id']) {
    return this.courseInstructorRepository.remove(id);
  }

  removeByCourseId(courseId: string) {
    return this.courseInstructorRepository.removeByCourseId(courseId);
  }

  /** Primary + ordered co-instructors for one course. */
  async findViewByCourseId(courseId: string): Promise<CourseInstructorsView> {
    return CourseInstructorsService.toView(
      await this.courseInstructorRepository.findByCourseId(courseId),
    );
  }

  /**
   * Same projection for a whole page of courses in a single query. Every
   * requested id is present in the map, with an empty view when the course
   * has no instructors yet.
   */
  async findViewByCourseIds(
    courseIds: string[],
  ): Promise<Map<string, CourseInstructorsView>> {
    const rows =
      await this.courseInstructorRepository.findByCourseIds(courseIds);
    const grouped = new Map<string, CourseInstructor[]>();

    for (const row of rows) {
      const bucket = grouped.get(row.course.id) ?? [];
      bucket.push(row);
      grouped.set(row.course.id, bucket);
    }

    const result = new Map<string, CourseInstructorsView>();
    for (const courseId of courseIds) {
      result.set(
        courseId,
        CourseInstructorsService.toView(grouped.get(courseId) ?? []),
      );
    }

    return result;
  }

  static toView(rows: CourseInstructor[]): CourseInstructorsView {
    const primary = rows.find((row) => row.role === 'primary');

    return {
      primaryInstructor: primary
        ? toInstructorRef(primary.instructor as Instructor)
        : null,
      coInstructors: rows
        .filter((row) => row.role !== 'primary')
        .sort((a, b) => a.displayOrder - b.displayOrder)
        .map((row) => toInstructorRef(row.instructor as Instructor)),
    };
  }
}
