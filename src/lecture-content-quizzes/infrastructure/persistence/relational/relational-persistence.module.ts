import { Module } from '@nestjs/common';
import { LectureContentQuizRepository } from '../lecture-content-quiz.repository';
import { LectureContentQuizRelationalRepository } from './repositories/lecture-content-quiz.repository';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LectureContentQuizEntity } from './entities/lecture-content-quiz.entity';

@Module({
  imports: [TypeOrmModule.forFeature([LectureContentQuizEntity])],
  providers: [
    {
      provide: LectureContentQuizRepository,
      useClass: LectureContentQuizRelationalRepository,
    },
  ],
  exports: [LectureContentQuizRepository],
})
export class RelationalLectureContentQuizPersistenceModule {}
