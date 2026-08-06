import { LecturesModule } from '../lectures/lectures.module';
import {
  // do not remove this comment
  Module,
} from '@nestjs/common';
import { ReflectionQuestionsService } from './reflection-questions.service';
import { ReflectionQuestionsController } from './reflection-questions.controller';
import { RelationalReflectionQuestionPersistenceModule } from './infrastructure/persistence/relational/relational-persistence.module';

@Module({
  imports: [
    LecturesModule,

    // do not remove this comment
    RelationalReflectionQuestionPersistenceModule,
  ],
  controllers: [ReflectionQuestionsController],
  providers: [ReflectionQuestionsService],
  exports: [
    ReflectionQuestionsService,
    RelationalReflectionQuestionPersistenceModule,
  ],
})
export class ReflectionQuestionsModule {}
