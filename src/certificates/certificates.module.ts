import { MediaFilesModule } from '../media-files/media-files.module';
import { CoursesModule } from '../courses/courses.module';
import { UsersModule } from '../users/users.module';
import { EnrollmentsModule } from '../enrollments/enrollments.module';
import {
  // do not remove this comment
  Module,
} from '@nestjs/common';
import { CertificatesService } from './certificates.service';
import { CertificatesController } from './certificates.controller';
import { RelationalCertificatePersistenceModule } from './infrastructure/persistence/relational/relational-persistence.module';

@Module({
  imports: [
    MediaFilesModule,

    CoursesModule,

    UsersModule,

    EnrollmentsModule,

    // do not remove this comment
    RelationalCertificatePersistenceModule,
  ],
  controllers: [CertificatesController],
  providers: [CertificatesService],
  exports: [CertificatesService, RelationalCertificatePersistenceModule],
})
export class CertificatesModule {}
