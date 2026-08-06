import { Module } from '@nestjs/common';
import { SectionRepository } from '../section.repository';
import { SectionRelationalRepository } from './repositories/section.repository';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SectionEntity } from './entities/section.entity';

@Module({
  imports: [TypeOrmModule.forFeature([SectionEntity])],
  providers: [
    {
      provide: SectionRepository,
      useClass: SectionRelationalRepository,
    },
  ],
  exports: [SectionRepository],
})
export class RelationalSectionPersistenceModule {}
