import { Module } from '@nestjs/common';
import { LectureRepository } from '../lecture.repository';
import { LectureRelationalRepository } from './repositories/lecture.repository';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LectureEntity } from './entities/lecture.entity';

@Module({
  imports: [TypeOrmModule.forFeature([LectureEntity])],
  providers: [
    {
      provide: LectureRepository,
      useClass: LectureRelationalRepository,
    },
  ],
  exports: [LectureRepository],
})
export class RelationalLecturePersistenceModule {}
