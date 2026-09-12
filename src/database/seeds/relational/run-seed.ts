import { NestFactory } from '@nestjs/core';
import { RoleSeedService } from './role/role-seed.service';
import { SeedModule } from './seed.module';
import { StatusSeedService } from './status/status-seed.service';
import { UserSeedService } from './user/user-seed.service';
import { ModuleSeedService } from './module/module-seed.service';
import { PermissionSeedService } from './permission/permission-seed.service';
import { RolePermissionSeedService } from './role-permission/role-permission-seed.service';
import { MasterDataGroupSeedService } from './master-data-group/master-data-group-seed.service';
import { MasterDataCodeSeedService } from './master-data-code/master-data-code-seed.service';
import { SuperAdminSeedService } from './super-admin/super-admin-seed.service';
import { InstructorSeedService } from './instructor/instructor-seed.service';

const runSeed = async () => {
  const app = await NestFactory.create(SeedModule);

  // run
  await app.get(RoleSeedService).run();
  await app.get(StatusSeedService).run();
  await app.get(UserSeedService).run();
  await app.get(ModuleSeedService).run();
  await app.get(PermissionSeedService).run();
  await app.get(RolePermissionSeedService).run();
  await app.get(MasterDataGroupSeedService).run();
  await app.get(MasterDataCodeSeedService).run();
  await app.get(InstructorSeedService).run();
  await app.get(SuperAdminSeedService).run();

  await app.close();
};

void runSeed();
