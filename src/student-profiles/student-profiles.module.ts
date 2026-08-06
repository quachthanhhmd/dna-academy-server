import { MasterDataCodesModule } from '../master-data-codes/master-data-codes.module';
import { UsersModule } from '../users/users.module';
import {
  // do not remove this comment
  Module,
} from '@nestjs/common';
import { StudentProfilesService } from './student-profiles.service';
import { StudentProfilesController } from './student-profiles.controller';
import { RelationalStudentProfilePersistenceModule } from './infrastructure/persistence/relational/relational-persistence.module';

@Module({
  imports: [
    MasterDataCodesModule,

    UsersModule,

    // do not remove this comment
    RelationalStudentProfilePersistenceModule,
  ],
  controllers: [StudentProfilesController],
  providers: [StudentProfilesService],
  exports: [StudentProfilesService, RelationalStudentProfilePersistenceModule],
})
export class StudentProfilesModule {}
