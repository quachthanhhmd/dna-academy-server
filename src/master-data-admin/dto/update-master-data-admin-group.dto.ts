import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateMasterDataAdminGroupDto } from './create-master-data-admin-group.dto';

/** Everything but `groupKey`, which code depends on and so never changes. */
export class UpdateMasterDataAdminGroupDto extends PartialType(
  OmitType(CreateMasterDataAdminGroupDto, ['groupKey'] as const),
) {}
