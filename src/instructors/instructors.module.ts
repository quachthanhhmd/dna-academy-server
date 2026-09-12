import {
  // do not remove this comment
  Module,
} from '@nestjs/common';
import { InstructorExpertisesModule } from '../instructor-expertises/instructor-expertises.module';
import { InstructorSocialLinksModule } from '../instructor-social-links/instructor-social-links.module';
import { InstructorsService } from './instructors.service';
import { InstructorProfilesService } from './instructor-profiles.service';
import { InstructorsPublicController } from './instructors-public.controller';
import { RelationalInstructorPersistenceModule } from './infrastructure/persistence/relational/relational-persistence.module';

@Module({
  imports: [
    InstructorExpertisesModule,
    InstructorSocialLinksModule,

    // do not remove this comment
    RelationalInstructorPersistenceModule,
  ],
  controllers: [InstructorsPublicController],
  providers: [InstructorsService, InstructorProfilesService],
  exports: [
    InstructorsService,
    InstructorProfilesService,
    RelationalInstructorPersistenceModule,
  ],
})
export class InstructorsModule {}
