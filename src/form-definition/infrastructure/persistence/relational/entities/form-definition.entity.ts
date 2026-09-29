import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { EntityRelationalHelper } from '../../../../../utils/relational-entity-helper';

@Entity({ name: 'form_definition' })
export class FormDefinitionEntity extends EntityRelationalHelper {
  @Column({
    name: 'code',
    nullable: false,
    type: String,
  })
  code: string;
  @Column({
    name: 'name_translations',
    type: 'jsonb',
    nullable: false,
  })
  nameTranslations: Record<string, string>;
  @Column({
    name: 'description_translations',
    type: 'jsonb',
    nullable: true,
  })
  descriptionTranslations: Record<string, string> | null;
  @Column({
    name: 'version',
    nullable: false,
    type: Number,
  })
  version: number;
  @Column({
    name: 'is_active',
    type: Boolean,
    nullable: false,
  })
  isActive: boolean;

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
