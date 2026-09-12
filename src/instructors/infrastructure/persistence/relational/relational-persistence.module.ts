import { Module } from '@nestjs/common';
import { InstructorRepository } from '../instructor.repository';
import { InstructorRelationalRepository } from './repositories/instructor.repository';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InstructorEntity } from './entities/instructor.entity';

@Module({
  imports: [TypeOrmModule.forFeature([InstructorEntity])],
  providers: [
    {
      provide: InstructorRepository,
      useClass: InstructorRelationalRepository,
    },
  ],
  exports: [InstructorRepository],
})
export class RelationalInstructorPersistenceModule {}
