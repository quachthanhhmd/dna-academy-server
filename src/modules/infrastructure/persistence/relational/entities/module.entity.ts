import {
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  Column,
  Unique,
} from 'typeorm';
import { EntityRelationalHelper } from '../../../../../utils/relational-entity-helper';

@Unique('UQ_module_name', ['name'])
@Entity({
  name: 'module',
})
export class ModuleEntity extends EntityRelationalHelper {
  @Column({
    name: 'label',
    nullable: true,
    type: String,
  })
  label?: string | null;

  @Column({
    name: 'name',
    nullable: false,
    type: String,
  })
  name: string;

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
