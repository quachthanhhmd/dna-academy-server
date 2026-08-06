import { Module } from '@nestjs/common';
import { CourseTargetLearnerRepository } from '../course-target-learner.repository';
import { CourseTargetLearnerRelationalRepository } from './repositories/course-target-learner.repository';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CourseTargetLearnerEntity } from './entities/course-target-learner.entity';

@Module({
  imports: [TypeOrmModule.forFeature([CourseTargetLearnerEntity])],
  providers: [
    {
      provide: CourseTargetLearnerRepository,
      useClass: CourseTargetLearnerRelationalRepository,
    },
  ],
  exports: [CourseTargetLearnerRepository],
})
export class RelationalCourseTargetLearnerPersistenceModule {}
