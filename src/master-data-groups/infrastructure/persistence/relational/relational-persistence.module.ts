import { Module } from '@nestjs/common';
import { MasterDataGroupRepository } from '../master-data-group.repository';
import { MasterDataGroupRelationalRepository } from './repositories/master-data-group.repository';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MasterDataGroupEntity } from './entities/master-data-group.entity';

@Module({
  imports: [TypeOrmModule.forFeature([MasterDataGroupEntity])],
  providers: [
    {
      provide: MasterDataGroupRepository,
      useClass: MasterDataGroupRelationalRepository,
    },
  ],
  exports: [MasterDataGroupRepository],
})
export class RelationalMasterDataGroupPersistenceModule {}
