import { Module } from '@nestjs/common';
import { LectureProgressRepository } from '../lecture-progress.repository';
import { LectureProgressRelationalRepository } from './repositories/lecture-progress.repository';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LectureProgressEntity } from './entities/lecture-progress.entity';

@Module({
  imports: [TypeOrmModule.forFeature([LectureProgressEntity])],
  providers: [
    {
      provide: LectureProgressRepository,
      useClass: LectureProgressRelationalRepository,
    },
  ],
  exports: [LectureProgressRepository],
})
export class RelationalLectureProgressPersistenceModule {}
