import { CoursesModule } from '../courses/courses.module';
import {
  // do not remove this comment
  Module,
} from '@nestjs/common';
import { CourseLearningOutcomesService } from './course-learning-outcomes.service';
import { CourseLearningOutcomesController } from './course-learning-outcomes.controller';
import { RelationalCourseLearningOutcomePersistenceModule } from './infrastructure/persistence/relational/relational-persistence.module';

@Module({
  imports: [
    CoursesModule,

    // do not remove this comment
    RelationalCourseLearningOutcomePersistenceModule,
  ],
  controllers: [CourseLearningOutcomesController],
  providers: [CourseLearningOutcomesService],
  exports: [
    CourseLearningOutcomesService,
    RelationalCourseLearningOutcomePersistenceModule,
  ],
})
export class CourseLearningOutcomesModule {}
