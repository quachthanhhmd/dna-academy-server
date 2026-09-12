import { Module } from '@nestjs/common';
import { CourseInstructorRepository } from '../course-instructor.repository';
import { CourseInstructorRelationalRepository } from './repositories/course-instructor.repository';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CourseInstructorEntity } from './entities/course-instructor.entity';

@Module({
  imports: [TypeOrmModule.forFeature([CourseInstructorEntity])],
  providers: [
    {
      provide: CourseInstructorRepository,
      useClass: CourseInstructorRelationalRepository,
    },
  ],
  exports: [CourseInstructorRepository],
})
export class RelationalCourseInstructorPersistenceModule {}
