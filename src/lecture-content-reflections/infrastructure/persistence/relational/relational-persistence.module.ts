import { Module } from '@nestjs/common';
import { LectureContentReflectionRepository } from '../lecture-content-reflection.repository';
import { LectureContentReflectionRelationalRepository } from './repositories/lecture-content-reflection.repository';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LectureContentReflectionEntity } from './entities/lecture-content-reflection.entity';

@Module({
  imports: [TypeOrmModule.forFeature([LectureContentReflectionEntity])],
  providers: [
    {
      provide: LectureContentReflectionRepository,
      useClass: LectureContentReflectionRelationalRepository,
    },
  ],
  exports: [LectureContentReflectionRepository],
})
export class RelationalLectureContentReflectionPersistenceModule {}
