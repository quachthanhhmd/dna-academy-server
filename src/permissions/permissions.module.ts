import { ModulesModule } from '../modules/modules.module';
import {
  // do not remove this comment
  Module,
} from '@nestjs/common';
import { PermissionsService } from './permissions.service';
import { PermissionsController } from './permissions.controller';
import { RelationalPermissionPersistenceModule } from './infrastructure/persistence/relational/relational-persistence.module';

@Module({
  imports: [
    ModulesModule,

    // do not remove this comment
    RelationalPermissionPersistenceModule,
  ],
  controllers: [PermissionsController],
  providers: [PermissionsService],
  exports: [PermissionsService, RelationalPermissionPersistenceModule],
})
export class PermissionsModule {}
