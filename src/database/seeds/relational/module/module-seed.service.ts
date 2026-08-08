import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ModuleEntity } from '../../../../modules/infrastructure/persistence/relational/entities/module.entity';
import { ADMIN_MODULES } from '../../../../authorization/authorization.constants';

@Injectable()
export class ModuleSeedService {
  constructor(
    @InjectRepository(ModuleEntity)
    private readonly repository: Repository<ModuleEntity>,
  ) {}

  async run() {
    for (const module of ADMIN_MODULES) {
      const count = await this.repository.count({
        where: { name: module.name },
      });

      if (!count) {
        await this.repository.save(
          this.repository.create({
            name: module.name,
            label: module.label,
          }),
        );
      }
    }
  }
}
