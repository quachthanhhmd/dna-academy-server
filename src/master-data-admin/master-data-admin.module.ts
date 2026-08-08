import { Module } from '@nestjs/common';
import { MasterDataGroupsModule } from '../master-data-groups/master-data-groups.module';
import { MasterDataCodesModule } from '../master-data-codes/master-data-codes.module';
import { CoursesModule } from '../courses/courses.module';
import { CourseGroupAssignmentsModule } from '../course-group-assignments/course-group-assignments.module';
import { AuthorizationModule } from '../authorization/authorization.module';
import { MasterDataAdminController } from './master-data-admin.controller';
import { MasterDataAdminService } from './master-data-admin.service';

@Module({
  imports: [
    MasterDataGroupsModule,
    MasterDataCodesModule,
    CoursesModule,
    CourseGroupAssignmentsModule,
    AuthorizationModule,
  ],
  controllers: [MasterDataAdminController],
  providers: [MasterDataAdminService],
})
export class MasterDataAdminModule {}
