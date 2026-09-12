import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { InstructorSeedService } from './instructor-seed.service';
import { InstructorEntity } from '../../../../instructors/infrastructure/persistence/relational/entities/instructor.entity';

@Module({
  imports: [TypeOrmModule.forFeature([InstructorEntity])],
  providers: [InstructorSeedService],
  exports: [InstructorSeedService],
})
export class InstructorSeedModule {}
