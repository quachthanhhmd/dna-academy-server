import {
  // do not remove this comment
  Module,
} from '@nestjs/common';
import { ModulesService } from './modules.service';
import { RelationalModulePersistenceModule } from './infrastructure/persistence/relational/relational-persistence.module';

@Module({
  imports: [
    // do not remove this comment
    RelationalModulePersistenceModule,
  ],
  providers: [ModulesService],
  exports: [ModulesService, RelationalModulePersistenceModule],
})
export class ModulesModule {}
