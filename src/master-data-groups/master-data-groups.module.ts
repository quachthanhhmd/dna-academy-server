import { UsersModule } from '../users/users.module';
import {
  // do not remove this comment
  Module,
} from '@nestjs/common';
import { MasterDataGroupsService } from './master-data-groups.service';
import { RelationalMasterDataGroupPersistenceModule } from './infrastructure/persistence/relational/relational-persistence.module';

@Module({
  imports: [
    UsersModule,

    // do not remove this comment
    RelationalMasterDataGroupPersistenceModule,
  ],
  providers: [MasterDataGroupsService],
  exports: [
    MasterDataGroupsService,
    RelationalMasterDataGroupPersistenceModule,
  ],
})
export class MasterDataGroupsModule {}
