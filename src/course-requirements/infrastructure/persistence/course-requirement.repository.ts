import { DeepPartial } from '../../../utils/types/deep-partial.type';
import { NullableType } from '../../../utils/types/nullable.type';
import { IPaginationOptions } from '../../../utils/types/pagination-options';
import { CourseRequirement } from '../../domain/course-requirement';

export abstract class CourseRequirementRepository {
  abstract create(
    data: Omit<CourseRequirement, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<CourseRequirement>;

  abstract findAllWithPagination({
    paginationOptions,
  }: {
    paginationOptions: IPaginationOptions;
  }): Promise<CourseRequirement[]>;

  abstract findById(
    id: CourseRequirement['id'],
  ): Promise<NullableType<CourseRequirement>>;

  abstract findByIds(
    ids: CourseRequirement['id'][],
  ): Promise<CourseRequirement[]>;

  abstract findByCourseId(courseId: string): Promise<CourseRequirement[]>;

  abstract removeByCourseId(courseId: string): Promise<void>;

  abstract update(
    id: CourseRequirement['id'],
    payload: DeepPartial<CourseRequirement>,
  ): Promise<CourseRequirement | null>;

  abstract remove(id: CourseRequirement['id']): Promise<void>;
}
