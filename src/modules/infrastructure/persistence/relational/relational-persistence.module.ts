import { Module } from '@nestjs/common';
import { ModuleRepository } from '../module.repository';
import { ModuleRelationalRepository } from './repositories/module.repository';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ModuleEntity } from './entities/module.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ModuleEntity])],
  providers: [
    {
      provide: ModuleRepository,
      useClass: ModuleRelationalRepository,
    },
  ],
  exports: [ModuleRepository],
})
export class RelationalModulePersistenceModule {}
