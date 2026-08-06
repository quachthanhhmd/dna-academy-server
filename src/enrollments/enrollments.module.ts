import { LecturesModule } from '../lectures/lectures.module';
import { CoursesModule } from '../courses/courses.module';
import { UsersModule } from '../users/users.module';
import { AuthModule } from '../auth/auth.module';
import {
  // do not remove this comment
  Module,
} from '@nestjs/common';
import { EnrollmentsService } from './enrollments.service';
import { EnrollmentsController } from './enrollments.controller';
import { RelationalEnrollmentPersistenceModule } from './infrastructure/persistence/relational/relational-persistence.module';

@Module({
  imports: [
    LecturesModule,

    CoursesModule,

    UsersModule,

    AuthModule,

    // do not remove this comment
    RelationalEnrollmentPersistenceModule,
  ],
  controllers: [EnrollmentsController],
  providers: [EnrollmentsService],
  exports: [EnrollmentsService, RelationalEnrollmentPersistenceModule],
})
export class EnrollmentsModule {}
