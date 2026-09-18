import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StatusEntity } from '../../../../statuses/infrastructure/persistence/relational/entities/status.entity';
import { StatusEnum } from '../../../../statuses/statuses.enum';

const STATUSES: [StatusEnum, string][] = [
  [StatusEnum.active, 'Active'],
  [StatusEnum.inactive, 'Inactive'],
  [StatusEnum.deactivated, 'Deactivated'],
];

/**
 * Inserts each status that is missing. Checked one by one, not "is the table
 * empty": a migration adds Deactivated before this ever runs on a fresh
 * database, and an emptiness check would then skip the other two.
 */
@Injectable()
export class StatusSeedService {
  constructor(
    @InjectRepository(StatusEntity)
    private readonly repository: Repository<StatusEntity>,
  ) {}

  async run() {
    for (const [id, name] of STATUSES) {
      const count = await this.repository.count({ where: { id } });

      if (!count) {
        await this.repository.save(this.repository.create({ id, name }));
      }
    }
  }
}
