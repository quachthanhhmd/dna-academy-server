import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FormAnswerRepository } from '../form-answer.repository';
import { FormAnswerRelationalRepository } from './repositories/form-answer.repository';
import { FormAnswerEntity } from './entities/form-answer.entity';

@Module({
  imports: [TypeOrmModule.forFeature([FormAnswerEntity])],
  providers: [
    {
      provide: FormAnswerRepository,
      useClass: FormAnswerRelationalRepository,
    },
  ],
  exports: [FormAnswerRepository],
})
export class RelationalFormAnswerPersistenceModule {}
