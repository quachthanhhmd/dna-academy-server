import { DeepPartial } from '../../../utils/types/deep-partial.type';
import { NullableType } from '../../../utils/types/nullable.type';
import { IPaginationOptions } from '../../../utils/types/pagination-options';
import { Course } from '../../domain/course';

export abstract class CourseRepository {
  abstract create(
    data: Omit<Course, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<Course>;

  abstract findAllWithPagination({
    filterOptions,
    paginationOptions,
  }: {
    filterOptions?: {
      status?: string;
      levelId?: string;
      categoryId?: string;
      instructorId?: number;
    } | null;
    paginationOptions: IPaginationOptions;
  }): Promise<Course[]>;

  abstract findById(id: Course['id']): Promise<NullableType<Course>>;

  abstract findByIds(ids: Course['id'][]): Promise<Course[]>;

  abstract findBySlug(slug: Course['slug']): Promise<NullableType<Course>>;

  abstract countByLevelId(levelId: string): Promise<number>;

  abstract countByCategoryId(categoryId: string): Promise<number>;

  abstract update(
    id: Course['id'],
    payload: DeepPartial<Course>,
  ): Promise<Course | null>;

  abstract remove(id: Course['id']): Promise<void>;
}
