import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserRoleEntity } from '../../../../user-roles/infrastructure/persistence/relational/entities/user-role.entity';
import { UserEntity } from '../../../../users/infrastructure/persistence/relational/entities/user.entity';
import { SuperAdminSeedService } from './super-admin-seed.service';

@Module({
  imports: [TypeOrmModule.forFeature([UserRoleEntity, UserEntity])],
  providers: [SuperAdminSeedService],
  exports: [SuperAdminSeedService],
})
export class SuperAdminSeedModule {}
