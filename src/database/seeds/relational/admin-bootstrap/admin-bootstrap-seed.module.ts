import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserEntity } from '../../../../users/infrastructure/persistence/relational/entities/user.entity';
import { RelationalUserRolePersistenceModule } from '../../../../user-roles/infrastructure/persistence/relational/relational-persistence.module';
import { AdminBootstrapSeedService } from './admin-bootstrap-seed.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserEntity]),
    RelationalUserRolePersistenceModule,
  ],
  providers: [AdminBootstrapSeedService],
  exports: [AdminBootstrapSeedService],
})
export class AdminBootstrapSeedModule {}
