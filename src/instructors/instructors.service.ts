import { Injectable } from '@nestjs/common';
import {
  InstructorFilterOptions,
  InstructorRepository,
  InstructorSortOptions,
} from './infrastructure/persistence/instructor.repository';
import { IPaginationOptions } from '../utils/types/pagination-options';
import { DeepPartial } from '../utils/types/deep-partial.type';
import { Instructor } from './domain/instructor';

/**
 * Persistence facade for instructor profiles. Business rules (slug
 * generation, activation, delete guards, assignment validation) live in
 * `instructors-admin` — this service stays a thin, reusable data layer so the
 * catalog and course modules can read instructors without importing admin
 * behaviour.
 */
@Injectable()
export class InstructorsService {
  constructor(private readonly instructorRepository: InstructorRepository) {}

  create(data: Omit<Instructor, 'id' | 'createdAt' | 'updatedAt'>) {
    return this.instructorRepository.create(data);
  }

  findAllWithPagination({
    filterOptions,
    sortOptions,
    paginationOptions,
  }: {
    filterOptions?: InstructorFilterOptions | null;
    sortOptions?: InstructorSortOptions | null;
    paginationOptions: IPaginationOptions;
  }) {
    return this.instructorRepository.findAllWithPagination({
      filterOptions,
      sortOptions,
      paginationOptions,
    });
  }

  findById(id: Instructor['id']) {
    return this.instructorRepository.findById(id);
  }

  findByIds(ids: Instructor['id'][]) {
    return this.instructorRepository.findByIds(ids);
  }

  findBySlug(slug: Instructor['slug']) {
    return this.instructorRepository.findBySlug(slug);
  }

  findByUserId(userId: number) {
    return this.instructorRepository.findByUserId(userId);
  }

  update(id: Instructor['id'], payload: DeepPartial<Instructor>) {
    return this.instructorRepository.update(id, payload);
  }

  remove(id: Instructor['id']) {
    return this.instructorRepository.remove(id);
  }
}
