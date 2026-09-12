import { DeepPartial } from '../../../utils/types/deep-partial.type';
import { NullableType } from '../../../utils/types/nullable.type';
import { IPaginationOptions } from '../../../utils/types/pagination-options';
import { CourseGroupAssignment } from '../../domain/course-group-assignment';

export abstract class CourseGroupAssignmentRepository {
  abstract create(
    data: Omit<CourseGroupAssignment, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<CourseGroupAssignment>;

  abstract findAllWithPagination({
    paginationOptions,
  }: {
    paginationOptions: IPaginationOptions;
  }): Promise<CourseGroupAssignment[]>;

  abstract findById(
    id: CourseGroupAssignment['id'],
  ): Promise<NullableType<CourseGroupAssignment>>;

  abstract findByIds(
    ids: CourseGroupAssignment['id'][],
  ): Promise<CourseGroupAssignment[]>;

  abstract countByGroupId(groupId: string): Promise<number>;

  abstract findByCourseId(courseId: string): Promise<CourseGroupAssignment[]>;

  /**
   * Group ids for a whole page of courses in one query — Epic 4.4 §1.3, the
   * `groupIds` card field that lets the category pills show their active state
   * without a second round trip. Every requested id is present in the map,
   * with an empty array when the course is in no group.
   */
  abstract findGroupIdsByCourseIds(
    courseIds: string[],
  ): Promise<Map<string, string[]>>;

  /**
   * Epic 4.5 §1.3 — the single group shown on a My Learning card.
   *
   * A course can sit in several groups, so the choice is ordered rather than
   * "whichever row came back first": lowest `displayOrder`, ties broken by
   * name. Same rule as the Epic 4.1 pathway card, and for the same reason —
   * otherwise the label changes between two identical requests.
   */
  abstract findPrimaryGroupByCourseIds(
    courseIds: string[],
  ): Promise<Map<string, { id: string; name: string }>>;

  abstract removeByCourseId(courseId: string): Promise<void>;

  abstract update(
    id: CourseGroupAssignment['id'],
    payload: DeepPartial<CourseGroupAssignment>,
  ): Promise<CourseGroupAssignment | null>;

  abstract remove(id: CourseGroupAssignment['id']): Promise<void>;
}
