import {
  // do not remove this comment
  Module,
} from '@nestjs/common';
import { ModulesService } from './modules.service';
import { ModulesController } from './modules.controller';
import { RelationalModulePersistenceModule } from './infrastructure/persistence/relational/relational-persistence.module';

@Module({
  imports: [
    // do not remove this comment
    RelationalModulePersistenceModule,
  ],
  controllers: [ModulesController],
  providers: [ModulesService],
  exports: [ModulesService, RelationalModulePersistenceModule],
})
export class ModulesModule {}
