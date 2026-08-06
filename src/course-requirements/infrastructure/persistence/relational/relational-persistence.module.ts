import { Module } from '@nestjs/common';
import { CourseRequirementRepository } from '../course-requirement.repository';
import { CourseRequirementRelationalRepository } from './repositories/course-requirement.repository';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CourseRequirementEntity } from './entities/course-requirement.entity';

@Module({
  imports: [TypeOrmModule.forFeature([CourseRequirementEntity])],
  providers: [
    {
      provide: CourseRequirementRepository,
      useClass: CourseRequirementRelationalRepository,
    },
  ],
  exports: [CourseRequirementRepository],
})
export class RelationalCourseRequirementPersistenceModule {}
