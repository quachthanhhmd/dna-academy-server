import { UsersModule } from '../users/users.module';
import {
  // do not remove this comment
  Module,
} from '@nestjs/common';
import { MasterDataGroupsService } from './master-data-groups.service';
import { MasterDataGroupsController } from './master-data-groups.controller';
import { RelationalMasterDataGroupPersistenceModule } from './infrastructure/persistence/relational/relational-persistence.module';

@Module({
  imports: [
    UsersModule,

    // do not remove this comment
    RelationalMasterDataGroupPersistenceModule,
  ],
  controllers: [MasterDataGroupsController],
  providers: [MasterDataGroupsService],
  exports: [
    MasterDataGroupsService,
    RelationalMasterDataGroupPersistenceModule,
  ],
})
export class MasterDataGroupsModule {}
