import { Module } from '@nestjs/common';
import { CertificateRepository } from '../certificate.repository';
import { CertificateRelationalRepository } from './repositories/certificate.repository';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CertificateEntity } from './entities/certificate.entity';

@Module({
  imports: [TypeOrmModule.forFeature([CertificateEntity])],
  providers: [
    {
      provide: CertificateRepository,
      useClass: CertificateRelationalRepository,
    },
  ],
  exports: [CertificateRepository],
})
export class RelationalCertificatePersistenceModule {}
