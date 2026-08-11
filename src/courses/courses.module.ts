import { UsersModule } from '../users/users.module';
import { MasterDataCodesModule } from '../master-data-codes/master-data-codes.module';
import {
  // do not remove this comment
  Module,
} from '@nestjs/common';
import { CoursesService } from './courses.service';
import { RelationalCoursePersistenceModule } from './infrastructure/persistence/relational/relational-persistence.module';

@Module({
  imports: [
    UsersModule,

    MasterDataCodesModule,

    // do not remove this comment
    RelationalCoursePersistenceModule,
  ],
  // No controller here on purpose: `/courses` is owned by CourseCatalogModule
  // (public catalog) and admin writes by CoursesAdminModule (`/admin/courses`).
  // CoursesService is exported for both.
  providers: [CoursesService],
  exports: [CoursesService, RelationalCoursePersistenceModule],
})
export class CoursesModule {}
