import { Module } from '@nestjs/common';
import { LectureContentArticleRepository } from '../lecture-content-article.repository';
import { LectureContentArticleRelationalRepository } from './repositories/lecture-content-article.repository';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LectureContentArticleEntity } from './entities/lecture-content-article.entity';

@Module({
  imports: [TypeOrmModule.forFeature([LectureContentArticleEntity])],
  providers: [
    {
      provide: LectureContentArticleRepository,
      useClass: LectureContentArticleRelationalRepository,
    },
  ],
  exports: [LectureContentArticleRepository],
})
export class RelationalLectureContentArticlePersistenceModule {}
