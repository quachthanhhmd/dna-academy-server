import { Module } from '@nestjs/common';
import { CourseGroupAssignmentRepository } from '../course-group-assignment.repository';
import { CourseGroupAssignmentRelationalRepository } from './repositories/course-group-assignment.repository';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CourseGroupAssignmentEntity } from './entities/course-group-assignment.entity';

@Module({
  imports: [TypeOrmModule.forFeature([CourseGroupAssignmentEntity])],
  providers: [
    {
      provide: CourseGroupAssignmentRepository,
      useClass: CourseGroupAssignmentRelationalRepository,
    },
  ],
  exports: [CourseGroupAssignmentRepository],
})
export class RelationalCourseGroupAssignmentPersistenceModule {}
