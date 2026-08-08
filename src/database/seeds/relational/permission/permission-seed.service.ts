import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PermissionEntity } from '../../../../permissions/infrastructure/persistence/relational/entities/permission.entity';
import { ModuleEntity } from '../../../../modules/infrastructure/persistence/relational/entities/module.entity';
import { PERMISSION_ACTIONS } from '../../../../authorization/authorization.constants';

@Injectable()
export class PermissionSeedService {
  constructor(
    @InjectRepository(PermissionEntity)
    private readonly repository: Repository<PermissionEntity>,
    @InjectRepository(ModuleEntity)
    private readonly moduleRepository: Repository<ModuleEntity>,
  ) {}

  async run() {
    const modules = await this.moduleRepository.find();

    for (const module of modules) {
      for (const { action, label } of PERMISSION_ACTIONS) {
        const count = await this.repository.count({
          where: { action, module: { id: module.id } },
        });

        if (!count) {
          await this.repository.save(
            this.repository.create({
              action,
              label,
              module,
            }),
          );
        }
      }
    }
  }
}
