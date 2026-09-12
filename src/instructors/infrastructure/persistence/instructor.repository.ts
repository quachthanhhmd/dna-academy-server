import { DeepPartial } from '../../../utils/types/deep-partial.type';
import { NullableType } from '../../../utils/types/nullable.type';
import { IPaginationOptions } from '../../../utils/types/pagination-options';
import { Instructor } from '../../domain/instructor';

export type InstructorFilterOptions = {
  /** Case-insensitive substring match over fullName + headline. */
  search?: string;
  isActive?: boolean;
  /** master_data_code id within the expertise_area group. */
  expertiseCodeId?: string;
  /**
   * Restricts to instructors assigned to at least one published course —
   * what the public catalog filter should offer.
   */
  hasPublishedCourse?: boolean;
};

export const INSTRUCTOR_SORT_FIELDS = [
  'fullName',
  'totalCourses',
  'totalStudents',
  'avgRating',
  'displayOrder',
  'createdAt',
] as const;

export type InstructorSortField = (typeof INSTRUCTOR_SORT_FIELDS)[number];

export type InstructorSortOptions = {
  field: InstructorSortField;
  order: 'ASC' | 'DESC';
};

export abstract class InstructorRepository {
  abstract create(
    data: Omit<Instructor, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<Instructor>;

  abstract findAllWithPagination({
    filterOptions,
    sortOptions,
    paginationOptions,
  }: {
    filterOptions?: InstructorFilterOptions | null;
    sortOptions?: InstructorSortOptions | null;
    paginationOptions: IPaginationOptions;
  }): Promise<{ data: Instructor[]; total: number }>;

  abstract findById(id: Instructor['id']): Promise<NullableType<Instructor>>;

  abstract findByIds(ids: Instructor['id'][]): Promise<Instructor[]>;

  abstract findBySlug(
    slug: Instructor['slug'],
  ): Promise<NullableType<Instructor>>;

  abstract findByUserId(userId: number): Promise<NullableType<Instructor>>;

  abstract update(
    id: Instructor['id'],
    payload: DeepPartial<Instructor>,
  ): Promise<Instructor | null>;

  abstract remove(id: Instructor['id']): Promise<void>;
}
