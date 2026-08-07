import { DeepPartial } from '../../../utils/types/deep-partial.type';
import { NullableType } from '../../../utils/types/nullable.type';
import { IPaginationOptions } from '../../../utils/types/pagination-options';
import { Section } from '../../domain/section';

export abstract class SectionRepository {
  abstract create(
    data: Omit<Section, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<Section>;

  abstract findAllWithPagination({
    paginationOptions,
  }: {
    paginationOptions: IPaginationOptions;
  }): Promise<Section[]>;

  abstract findById(id: Section['id']): Promise<NullableType<Section>>;

  abstract findByIds(ids: Section['id'][]): Promise<Section[]>;

  abstract findByCourseId(courseId: string): Promise<Section[]>;

  abstract countByCourseId(courseId: string): Promise<number>;

  abstract update(
    id: Section['id'],
    payload: DeepPartial<Section>,
  ): Promise<Section | null>;

  abstract remove(id: Section['id']): Promise<void>;
}
