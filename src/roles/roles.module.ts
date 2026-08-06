import { Module } from '@nestjs/common';
import { RolesService } from './roles.service';
import { RelationalRolePersistenceModule } from './infrastructure/persistence/relational/relational-persistence.module';

@Module({
  imports: [RelationalRolePersistenceModule],
  providers: [RolesService],
  exports: [RolesService, RelationalRolePersistenceModule],
})
export class RolesModule {}
