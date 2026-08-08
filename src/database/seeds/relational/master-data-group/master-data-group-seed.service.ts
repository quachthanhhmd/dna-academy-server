import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MasterDataGroupEntity } from '../../../../master-data-groups/infrastructure/persistence/relational/entities/master-data-group.entity';

// V1: group_key values are hard-coded here rather than admin-manageable —
// see epic_2_roles_master_data.md ("V1 need to hard the group_key code in
// the database, improve later"). Admins may only manage codes within these
// groups in V1, not the groups themselves.
const MASTER_DATA_GROUPS: ReadonlyArray<{
  groupKey: string;
  name: string;
  displayOrder: number;
}> = [
  { groupKey: 'course_group', name: 'Course Group', displayOrder: 1 },
  { groupKey: 'course_level', name: 'Course Level', displayOrder: 2 },
  { groupKey: 'course_category', name: 'Course Category', displayOrder: 3 },
  { groupKey: 'lecture_type', name: 'Lecture Type', displayOrder: 4 },
  { groupKey: 'course_status', name: 'Course Status', displayOrder: 5 },
  { groupKey: 'education_stage', name: 'Education Stage', displayOrder: 6 },
  { groupKey: 'career_interest', name: 'Career Interest', displayOrder: 7 },
];

@Injectable()
export class MasterDataGroupSeedService {
  constructor(
    @InjectRepository(MasterDataGroupEntity)
    private readonly repository: Repository<MasterDataGroupEntity>,
  ) {}

  async run() {
    for (const group of MASTER_DATA_GROUPS) {
      const count = await this.repository.count({
        where: { groupKey: group.groupKey },
      });

      if (!count) {
        await this.repository.save(
          this.repository.create({
            groupKey: group.groupKey,
            name: group.name,
            isActive: true,
            displayOrder: group.displayOrder,
          }),
        );
      }
    }
  }
}
