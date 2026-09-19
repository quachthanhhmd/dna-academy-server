import { DeepPartial } from '../../../utils/types/deep-partial.type';
import { NullableType } from '../../../utils/types/nullable.type';
import { IPaginationOptions } from '../../../utils/types/pagination-options';
import { Course } from '../../domain/course';
import type { CatalogSort } from './catalog-sort';

// Public catalog filters. `status`/`enrollmentOpen` are deliberately absent:
// the catalog query hard-codes published + open enrollment so an unpublished
// course can never leak through a caller-supplied filter.
//
// Epic 4.4 §1.2 — the four id filters are plural: OR within one dimension,
// AND across dimensions. An **empty array means no filter**, never "match
// nothing"; the service normalises empty to `undefined` before it gets here,
// and the repository guards on `.length` as well.
export type CourseCatalogFilterOptions = {
  search?: string;
  groupIds?: string[];
  categoryIds?: string[];
  levelIds?: string[];
  instructorIds?: string[];
  minPrice?: number;
  maxPrice?: number;
  isFree?: boolean;
  language?: string;
  minRating?: number;
  // Epic 4 v2 §2.2
  minDurationSecs?: number;
  maxDurationSecs?: number;
  hasCertificate?: boolean;
};

// Re-exported so the DTO, the service and the repository keep importing the
// sort vocabulary from one place. The rules live in ./catalog-sort.
export {
  CATALOG_SORTS,
  DEFAULT_CATALOG_SORT,
  resolveCatalogSort,
} from './catalog-sort';
export type { CatalogSort } from './catalog-sort';

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
      instructorId?: string;
      /** Permission model §1.8 — only these courses; empty means none. */
      courseIds?: string[];
    } | null;
    paginationOptions: IPaginationOptions;
  }): Promise<Course[]>;

  abstract findCatalog({
    filterOptions,
    sortBy,
    paginationOptions,
  }: {
    filterOptions?: CourseCatalogFilterOptions | null;
    sortBy?: CatalogSort | null;
    paginationOptions: IPaginationOptions;
  }): Promise<{ data: Course[]; total: number }>;

  abstract findById(id: Course['id']): Promise<NullableType<Course>>;

  abstract findByIds(ids: Course['id'][]): Promise<Course[]>;

  abstract findBySlug(slug: Course['slug']): Promise<NullableType<Course>>;

  abstract findByCourseId(courseId: string): Promise<NullableType<Course>>;

  abstract countByLevelId(levelId: string): Promise<number>;

  abstract countByCategoryId(categoryId: string): Promise<number>;

  abstract update(
    id: Course['id'],
    payload: DeepPartial<Course>,
  ): Promise<Course | null>;

  abstract remove(id: Course['id']): Promise<void>;
}
