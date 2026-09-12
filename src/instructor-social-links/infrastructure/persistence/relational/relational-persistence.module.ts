import { Module } from '@nestjs/common';
import { InstructorSocialLinkRepository } from '../instructor-social-link.repository';
import { InstructorSocialLinkRelationalRepository } from './repositories/instructor-social-link.repository';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InstructorSocialLinkEntity } from './entities/instructor-social-link.entity';

@Module({
  imports: [TypeOrmModule.forFeature([InstructorSocialLinkEntity])],
  providers: [
    {
      provide: InstructorSocialLinkRepository,
      useClass: InstructorSocialLinkRelationalRepository,
    },
  ],
  exports: [InstructorSocialLinkRepository],
})
export class RelationalInstructorSocialLinkPersistenceModule {}
