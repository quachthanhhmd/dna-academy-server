// Don't forget to use the class-validator decorators in the DTO properties.
// import { Allow } from 'class-validator';

import { PartialType } from '@nestjs/swagger';
import { CreateMasterDataGroupDto } from './create-master-data-group.dto';

export class UpdateMasterDataGroupDto extends PartialType(
  CreateMasterDataGroupDto,
) {}
