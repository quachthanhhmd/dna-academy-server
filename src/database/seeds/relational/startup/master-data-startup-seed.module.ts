import { Module } from '@nestjs/common';
import { MasterDataGroupSeedModule } from '../master-data-group/master-data-group-seed.module';
import { MasterDataCodeSeedModule } from '../master-data-code/master-data-code-seed.module';
import { SuperAdminSeedModule } from '../super-admin/super-admin-seed.module';
import { MasterDataStartupSeedService } from './master-data-startup-seed.service';

@Module({
  imports: [
    MasterDataGroupSeedModule,
    MasterDataCodeSeedModule,
    SuperAdminSeedModule,
  ],
  providers: [MasterDataStartupSeedService],
})
export class MasterDataStartupSeedModule {}
