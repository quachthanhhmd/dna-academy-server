import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { MasterDataGroupSeedService } from './master-data-group-seed.service';
import { MasterDataGroupEntity } from '../../../../master-data-groups/infrastructure/persistence/relational/entities/master-data-group.entity';

@Module({
  imports: [TypeOrmModule.forFeature([MasterDataGroupEntity])],
  providers: [MasterDataGroupSeedService],
  exports: [MasterDataGroupSeedService],
})
export class MasterDataGroupSeedModule {}
