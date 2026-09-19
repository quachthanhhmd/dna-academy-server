import {
  // common
  Module,
} from '@nestjs/common';

import { UsersService } from './users.service';
import { RelationalUserPersistenceModule } from './infrastructure/persistence/relational/relational-persistence.module';
import { FilesModule } from '../files/files.module';

@Module({
  imports: [
    // import modules, etc.
    RelationalUserPersistenceModule,
    FilesModule,
  ],
  providers: [UsersService],
  exports: [UsersService, RelationalUserPersistenceModule],
})
export class UsersModule {}
