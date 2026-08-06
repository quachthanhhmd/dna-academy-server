import { Module } from '@nestjs/common';
import { StudentCareerInterestRepository } from '../student-career-interest.repository';
import { StudentCareerInterestRelationalRepository } from './repositories/student-career-interest.repository';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StudentCareerInterestEntity } from './entities/student-career-interest.entity';

@Module({
  imports: [TypeOrmModule.forFeature([StudentCareerInterestEntity])],
  providers: [
    {
      provide: StudentCareerInterestRepository,
      useClass: StudentCareerInterestRelationalRepository,
    },
  ],
  exports: [StudentCareerInterestRepository],
})
export class RelationalStudentCareerInterestPersistenceModule {}
