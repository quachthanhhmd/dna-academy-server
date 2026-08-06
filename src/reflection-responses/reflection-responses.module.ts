import { ReflectionQuestionsModule } from '../reflection-questions/reflection-questions.module';
import { EnrollmentsModule } from '../enrollments/enrollments.module';
import {
  // do not remove this comment
  Module,
} from '@nestjs/common';
import { ReflectionResponsesService } from './reflection-responses.service';
import { ReflectionResponsesController } from './reflection-responses.controller';
import { RelationalReflectionResponsePersistenceModule } from './infrastructure/persistence/relational/relational-persistence.module';

@Module({
  imports: [
    ReflectionQuestionsModule,

    EnrollmentsModule,

    // do not remove this comment
    RelationalReflectionResponsePersistenceModule,
  ],
  controllers: [ReflectionResponsesController],
  providers: [ReflectionResponsesService],
  exports: [
    ReflectionResponsesService,
    RelationalReflectionResponsePersistenceModule,
  ],
})
export class ReflectionResponsesModule {}
