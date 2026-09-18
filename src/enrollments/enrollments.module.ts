import { LecturesModule } from '../lectures/lectures.module';
import { CoursesModule } from '../courses/courses.module';
import { UsersModule } from '../users/users.module';
import { AuthModule } from '../auth/auth.module';
import {
  // do not remove this comment
  Module,
} from '@nestjs/common';
import { AuthorizationModule } from '../authorization/authorization.module';
import { EnrollmentsService } from './enrollments.service';
import { RelationalEnrollmentPersistenceModule } from './infrastructure/persistence/relational/relational-persistence.module';

@Module({
  imports: [
    // PermissionGuard is applied via @UseGuards on this module's controller,
    // so Nest builds it here and needs its own dependencies in scope.
    AuthorizationModule,
    LecturesModule,

    CoursesModule,

    UsersModule,

    AuthModule,

    // do not remove this comment
    RelationalEnrollmentPersistenceModule,
  ],
  providers: [EnrollmentsService],
  exports: [EnrollmentsService, RelationalEnrollmentPersistenceModule],
})
export class EnrollmentsModule {}
