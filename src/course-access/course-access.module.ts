import { Module } from '@nestjs/common';
import { AuthorizationModule } from '../authorization/authorization.module';
import { CourseAccessService } from './course-access.service';
import { CourseAccessRepository } from './course-access.repository';
import { CourseAccessGuard } from './course-access.guard';

@Module({
  imports: [AuthorizationModule],
  providers: [CourseAccessService, CourseAccessRepository, CourseAccessGuard],
  exports: [
    CourseAccessService,
    CourseAccessRepository,
    CourseAccessGuard,
    AuthorizationModule,
  ],
})
export class CourseAccessModule {}
