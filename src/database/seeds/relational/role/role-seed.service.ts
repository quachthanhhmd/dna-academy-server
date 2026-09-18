import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RoleEntity } from '../../../../roles/infrastructure/persistence/relational/entities/role.entity';
import { RoleEnum } from '../../../../roles/roles.enum';

@Injectable()
export class RoleSeedService {
  constructor(
    @InjectRepository(RoleEntity)
    private readonly repository: Repository<RoleEntity>,
  ) {}

  async run() {
    const countUser = await this.repository.count({
      where: {
        id: RoleEnum.user,
      },
    });

    if (!countUser) {
      await this.repository.save(
        this.repository.create({
          id: RoleEnum.user,
          name: 'User',
        }),
      );
    }

    const countAdmin = await this.repository.count({
      where: {
        id: RoleEnum.admin,
      },
    });

    if (!countAdmin) {
      await this.repository.save(
        this.repository.create({
          id: RoleEnum.admin,
          name: 'Admin',
        }),
      );
    }

    const countInstructor = await this.repository.count({
      where: {
        id: RoleEnum.instructor,
      },
    });

    if (!countInstructor) {
      await this.repository.save(
        this.repository.create({
          id: RoleEnum.instructor,
          name: 'Instructor',
          description:
            'A teaching account. Excluded from student metrics; grants no admin access.',
          isActive: true,
        }),
      );
    }

    const countSuperAdmin = await this.repository.count({
      where: {
        id: RoleEnum.superAdmin,
      },
    });

    if (!countSuperAdmin) {
      await this.repository.save(
        this.repository.create({
          id: RoleEnum.superAdmin,
          name: 'Super Admin',
          description: 'Full access to all admin panel modules and actions.',
          isActive: true,
        }),
      );
    }
  }
}
