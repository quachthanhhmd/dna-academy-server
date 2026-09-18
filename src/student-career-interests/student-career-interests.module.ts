import { MasterDataCodesModule } from '../master-data-codes/master-data-codes.module';
import { UsersModule } from '../users/users.module';
import {
  // do not remove this comment
  Module,
} from '@nestjs/common';
import { StudentCareerInterestsService } from './student-career-interests.service';
import { RelationalStudentCareerInterestPersistenceModule } from './infrastructure/persistence/relational/relational-persistence.module';

@Module({
  imports: [
    MasterDataCodesModule,

    UsersModule,

    // do not remove this comment
    RelationalStudentCareerInterestPersistenceModule,
  ],
  providers: [StudentCareerInterestsService],
  exports: [
    StudentCareerInterestsService,
    RelationalStudentCareerInterestPersistenceModule,
  ],
})
export class StudentCareerInterestsModule {}
