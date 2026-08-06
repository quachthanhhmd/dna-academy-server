import { Module } from '@nestjs/common';
import { StudentProfileRepository } from '../student-profile.repository';
import { StudentProfileRelationalRepository } from './repositories/student-profile.repository';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StudentProfileEntity } from './entities/student-profile.entity';

@Module({
  imports: [TypeOrmModule.forFeature([StudentProfileEntity])],
  providers: [
    {
      provide: StudentProfileRepository,
      useClass: StudentProfileRelationalRepository,
    },
  ],
  exports: [StudentProfileRepository],
})
export class RelationalStudentProfilePersistenceModule {}
