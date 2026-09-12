import {
  // do not remove this comment
  Module,
} from '@nestjs/common';
import { InstructorSocialLinksService } from './instructor-social-links.service';
import { RelationalInstructorSocialLinkPersistenceModule } from './infrastructure/persistence/relational/relational-persistence.module';

@Module({
  imports: [
    // do not remove this comment
    RelationalInstructorSocialLinkPersistenceModule,
  ],
  providers: [InstructorSocialLinksService],
  exports: [
    InstructorSocialLinksService,
    RelationalInstructorSocialLinkPersistenceModule,
  ],
})
export class InstructorSocialLinksModule {}
