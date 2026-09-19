import { MediaFilesModule } from '../media-files/media-files.module';
import { CoursesModule } from '../courses/courses.module';
import { UsersModule } from '../users/users.module';
import { EnrollmentsModule } from '../enrollments/enrollments.module';
import {
  // do not remove this comment
  Module,
} from '@nestjs/common';
import { AuthorizationModule } from '../authorization/authorization.module';
import { CertificatesService } from './certificates.service';
import { RelationalCertificatePersistenceModule } from './infrastructure/persistence/relational/relational-persistence.module';

@Module({
  imports: [
    // PermissionGuard is applied via @UseGuards on this module's controller,
    // so Nest builds it here and needs its own dependencies in scope.
    AuthorizationModule,
    MediaFilesModule,

    CoursesModule,

    UsersModule,

    EnrollmentsModule,

    // do not remove this comment
    RelationalCertificatePersistenceModule,
  ],
  providers: [CertificatesService],
  exports: [CertificatesService, RelationalCertificatePersistenceModule],
})
export class CertificatesModule {}
