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

  abstract removeByCourseId(courseId: string): Promise<void>;

  abstract update(
    id: CourseGroupAssignment['id'],
    payload: DeepPartial<CourseGroupAssignment>,
  ): Promise<CourseGroupAssignment | null>;

  abstract remove(id: CourseGroupAssignment['id']): Promise<void>;
}
