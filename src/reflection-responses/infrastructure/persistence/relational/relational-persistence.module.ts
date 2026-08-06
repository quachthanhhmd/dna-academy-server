import { Module } from '@nestjs/common';
import { ReflectionResponseRepository } from '../reflection-response.repository';
import { ReflectionResponseRelationalRepository } from './repositories/reflection-response.repository';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReflectionResponseEntity } from './entities/reflection-response.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ReflectionResponseEntity])],
  providers: [
    {
      provide: ReflectionResponseRepository,
      useClass: ReflectionResponseRelationalRepository,
    },
  ],
  exports: [ReflectionResponseRepository],
})
export class RelationalReflectionResponsePersistenceModule {}
