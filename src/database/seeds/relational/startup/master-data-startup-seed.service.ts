import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { MasterDataGroupSeedService } from '../master-data-group/master-data-group-seed.service';
import { MasterDataCodeSeedService } from '../master-data-code/master-data-code-seed.service';
import { SuperAdminSeedService } from '../super-admin/super-admin-seed.service';

/**
 * Runs the hard-coded startup seeds on every application boot.
 *
 * Both seeds are insert-if-missing, so this is a no-op once the rows exist and
 * it never overwrites values an admin edited through /admin/master-data. The
 * groups must be seeded before the codes, which is why they run in sequence
 * here rather than as two independent hooks.
 */
@Injectable()
export class MasterDataStartupSeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger(MasterDataStartupSeedService.name);

  constructor(
    private readonly groupSeedService: MasterDataGroupSeedService,
    private readonly codeSeedService: MasterDataCodeSeedService,
    private readonly superAdminSeedService: SuperAdminSeedService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    try {
      await this.groupSeedService.run();
      await this.codeSeedService.run();
      // Without this a fresh database has nobody who can pass a
      // @RequirePermission check, including the route that assigns roles.
      await this.superAdminSeedService.run();
    } catch (error) {
      // Seeding is a convenience, not a precondition for serving traffic —
      // a failure here (e.g. migrations not yet applied) must not stop boot.
      this.logger.error('Master data seeding failed on startup', error);
    }
  }
}
