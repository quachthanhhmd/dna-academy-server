import { ModulesModule } from '../modules/modules.module';
import {
  // do not remove this comment
  Module,
} from '@nestjs/common';
import { PermissionsService } from './permissions.service';
import { RelationalPermissionPersistenceModule } from './infrastructure/persistence/relational/relational-persistence.module';

@Module({
  imports: [
    ModulesModule,

    // do not remove this comment
    RelationalPermissionPersistenceModule,
  ],
  providers: [PermissionsService],
  exports: [PermissionsService, RelationalPermissionPersistenceModule],
})
export class PermissionsModule {}
