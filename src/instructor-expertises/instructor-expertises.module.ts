import {
  // do not remove this comment
  Module,
} from '@nestjs/common';
import { InstructorExpertisesService } from './instructor-expertises.service';
import { RelationalInstructorExpertisePersistenceModule } from './infrastructure/persistence/relational/relational-persistence.module';

@Module({
  imports: [
    // do not remove this comment
    RelationalInstructorExpertisePersistenceModule,
  ],
  providers: [InstructorExpertisesService],
  exports: [
    InstructorExpertisesService,
    RelationalInstructorExpertisePersistenceModule,
  ],
})
export class InstructorExpertisesModule {}
