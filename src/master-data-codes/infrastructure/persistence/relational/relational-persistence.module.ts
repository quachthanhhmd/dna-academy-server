import { Module } from '@nestjs/common';
import { MasterDataCodeRepository } from '../master-data-code.repository';
import { MasterDataCodeRelationalRepository } from './repositories/master-data-code.repository';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MasterDataCodeEntity } from './entities/master-data-code.entity';

@Module({
  imports: [TypeOrmModule.forFeature([MasterDataCodeEntity])],
  providers: [
    {
      provide: MasterDataCodeRepository,
      useClass: MasterDataCodeRelationalRepository,
    },
  ],
  exports: [MasterDataCodeRepository],
})
export class RelationalMasterDataCodePersistenceModule {}
