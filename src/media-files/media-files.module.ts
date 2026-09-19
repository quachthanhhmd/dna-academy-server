import { UsersModule } from '../users/users.module';
import {
  // do not remove this comment
  Module,
} from '@nestjs/common';
import { MediaFilesService } from './media-files.service';
import { RelationalMediaFilePersistenceModule } from './infrastructure/persistence/relational/relational-persistence.module';

@Module({
  imports: [
    UsersModule,

    // do not remove this comment
    RelationalMediaFilePersistenceModule,
  ],
  providers: [MediaFilesService],
  exports: [MediaFilesService, RelationalMediaFilePersistenceModule],
})
export class MediaFilesModule {}
