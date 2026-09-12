import { Module } from '@nestjs/common';
import { InstructorsModule } from '../instructors/instructors.module';
import { InstructorExpertisesModule } from '../instructor-expertises/instructor-expertises.module';
import { InstructorSocialLinksModule } from '../instructor-social-links/instructor-social-links.module';
import { CourseInstructorsModule } from '../course-instructors/course-instructors.module';
import { MasterDataCodesModule } from '../master-data-codes/master-data-codes.module';
import { UsersModule } from '../users/users.module';
import { EnrollmentsModule } from '../enrollments/enrollments.module';
import { AuthorizationModule } from '../authorization/authorization.module';
import { InstructorsAdminController } from './instructors-admin.controller';
import { InstructorsAdminService } from './instructors-admin.service';
import { InstructorStatsService } from './instructor-stats.service';

@Module({
  imports: [
    InstructorsModule,
    InstructorExpertisesModule,
    InstructorSocialLinksModule,
    CourseInstructorsModule,
    MasterDataCodesModule,
    UsersModule,
    EnrollmentsModule,
    AuthorizationModule,
  ],
  controllers: [InstructorsAdminController],
  providers: [InstructorsAdminService, InstructorStatsService],
  exports: [InstructorsAdminService, InstructorStatsService],
})
export class InstructorsAdminModule {}
