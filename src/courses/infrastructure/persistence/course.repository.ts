import { DeepPartial } from '../../../utils/types/deep-partial.type';
import { NullableType } from '../../../utils/types/nullable.type';
import { IPaginationOptions } from '../../../utils/types/pagination-options';
import { Course } from '../../domain/course';

// Public catalog filters. `status`/`enrollmentOpen` are deliberately absent:
// the catalog query hard-codes published + open enrollment so an unpublished
// course can never leak through a caller-supplied filter.
export type CourseCatalogFilterOptions = {
  search?: string;
  groupId?: string;
  categoryId?: string;
  levelId?: string;
  minPrice?: number;
  maxPrice?: number;
  isFree?: boolean;
  language?: string;
  instructorId?: number;
  minRating?: number;
};

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

  abstract findCatalog({
    filterOptions,
    paginationOptions,
  }: {
    filterOptions?: CourseCatalogFilterOptions | null;
    paginationOptions: IPaginationOptions;
  }): Promise<{ data: Course[]; total: number }>;

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
