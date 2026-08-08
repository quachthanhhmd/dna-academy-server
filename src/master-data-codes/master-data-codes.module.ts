import { UsersModule } from '../users/users.module';
import { MasterDataGroupsModule } from '../master-data-groups/master-data-groups.module';
import {
  // do not remove this comment
  Module,
} from '@nestjs/common';
import { MasterDataCodesService } from './master-data-codes.service';
import { MasterDataCodesController } from './master-data-codes.controller';
import { MasterDataCodesPublicController } from './master-data-codes-public.controller';
import { RelationalMasterDataCodePersistenceModule } from './infrastructure/persistence/relational/relational-persistence.module';

@Module({
  imports: [
    UsersModule,

    MasterDataGroupsModule,

    // do not remove this comment
    RelationalMasterDataCodePersistenceModule,
  ],
  controllers: [MasterDataCodesController, MasterDataCodesPublicController],
  providers: [MasterDataCodesService],
  exports: [MasterDataCodesService, RelationalMasterDataCodePersistenceModule],
})
export class MasterDataCodesModule {}
