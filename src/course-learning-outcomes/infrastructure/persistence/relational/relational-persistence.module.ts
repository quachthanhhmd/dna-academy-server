import { Module } from '@nestjs/common';
import { CourseLearningOutcomeRepository } from '../course-learning-outcome.repository';
import { CourseLearningOutcomeRelationalRepository } from './repositories/course-learning-outcome.repository';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CourseLearningOutcomeEntity } from './entities/course-learning-outcome.entity';

@Module({
  imports: [TypeOrmModule.forFeature([CourseLearningOutcomeEntity])],
  providers: [
    {
      provide: CourseLearningOutcomeRepository,
      useClass: CourseLearningOutcomeRelationalRepository,
    },
  ],
  exports: [CourseLearningOutcomeRepository],
})
export class RelationalCourseLearningOutcomePersistenceModule {}
