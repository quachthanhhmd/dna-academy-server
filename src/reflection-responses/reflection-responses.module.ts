import { ReflectionQuestionsModule } from '../reflection-questions/reflection-questions.module';
import { EnrollmentsModule } from '../enrollments/enrollments.module';
import {
  // do not remove this comment
  Module,
} from '@nestjs/common';
import { AuthorizationModule } from '../authorization/authorization.module';
import { ReflectionResponsesService } from './reflection-responses.service';
import { RelationalReflectionResponsePersistenceModule } from './infrastructure/persistence/relational/relational-persistence.module';

@Module({
  imports: [
    // PermissionGuard is applied via @UseGuards on this module's controller,
    // so Nest builds it here and needs its own dependencies in scope.
    AuthorizationModule,
    ReflectionQuestionsModule,

    EnrollmentsModule,

    // do not remove this comment
    RelationalReflectionResponsePersistenceModule,
  ],
  providers: [ReflectionResponsesService],
  exports: [
    ReflectionResponsesService,
    RelationalReflectionResponsePersistenceModule,
  ],
})
export class ReflectionResponsesModule {}
