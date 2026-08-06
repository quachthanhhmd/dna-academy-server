import { Module } from '@nestjs/common';
import { UserRoleRepository } from '../user-role.repository';
import { UserRoleRelationalRepository } from './repositories/user-role.repository';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserRoleEntity } from './entities/user-role.entity';

@Module({
  imports: [TypeOrmModule.forFeature([UserRoleEntity])],
  providers: [
    {
      provide: UserRoleRepository,
      useClass: UserRoleRelationalRepository,
    },
  ],
  exports: [UserRoleRepository],
})
export class RelationalUserRolePersistenceModule {}
