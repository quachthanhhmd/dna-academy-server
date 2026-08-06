import { Module } from '@nestjs/common';
import { EnrollmentRepository } from '../enrollment.repository';
import { EnrollmentRelationalRepository } from './repositories/enrollment.repository';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EnrollmentEntity } from './entities/enrollment.entity';

@Module({
  imports: [TypeOrmModule.forFeature([EnrollmentEntity])],
  providers: [
    {
      provide: EnrollmentRepository,
      useClass: EnrollmentRelationalRepository,
    },
  ],
  exports: [EnrollmentRepository],
})
export class RelationalEnrollmentPersistenceModule {}
