import { Module } from '@nestjs/common';
import { InstructorExpertiseRepository } from '../instructor-expertise.repository';
import { InstructorExpertiseRelationalRepository } from './repositories/instructor-expertise.repository';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InstructorExpertiseEntity } from './entities/instructor-expertise.entity';

@Module({
  imports: [TypeOrmModule.forFeature([InstructorExpertiseEntity])],
  providers: [
    {
      provide: InstructorExpertiseRepository,
      useClass: InstructorExpertiseRelationalRepository,
    },
  ],
  exports: [InstructorExpertiseRepository],
})
export class RelationalInstructorExpertisePersistenceModule {}
