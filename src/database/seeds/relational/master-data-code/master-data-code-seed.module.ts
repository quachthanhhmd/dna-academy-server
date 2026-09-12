import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { MasterDataCodeSeedService } from './master-data-code-seed.service';
import { MasterDataCodeEntity } from '../../../../master-data-codes/infrastructure/persistence/relational/entities/master-data-code.entity';
import { MasterDataGroupEntity } from '../../../../master-data-groups/infrastructure/persistence/relational/entities/master-data-group.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([MasterDataCodeEntity, MasterDataGroupEntity]),
  ],
  providers: [MasterDataCodeSeedService],
  exports: [MasterDataCodeSeedService],
})
export class MasterDataCodeSeedModule {}
