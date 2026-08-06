// Don't forget to use the class-validator decorators in the DTO properties.
// import { Allow } from 'class-validator';

import { PartialType } from '@nestjs/swagger';
import { CreateMasterDataCodeDto } from './create-master-data-code.dto';

export class UpdateMasterDataCodeDto extends PartialType(
  CreateMasterDataCodeDto,
) {}
