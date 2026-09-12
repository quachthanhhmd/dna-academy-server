import { Column, Entity, PrimaryColumn } from 'typeorm';
import { EntityRelationalHelper } from '../../../../../utils/relational-entity-helper';

@Entity({
  name: 'role',
})
export class RoleEntity extends EntityRelationalHelper {
  @Column({
    name: 'description',
    nullable: true,
    type: String,
  })
  description?: string | null;

  @Column({
    name: 'is_active',
    default: true,
  })
  isActive?: boolean;

  @PrimaryColumn()
  id: number;

  @Column({ name: 'name' })
  name?: string;
}
