import { SetMetadata } from '@nestjs/common';
import {
  PERMISSION_METADATA_KEY,
  RequiredPermission,
} from './authorization.constants';

export const RequirePermission = (module: string, action: string) =>
  SetMetadata<string, RequiredPermission>(PERMISSION_METADATA_KEY, {
    module,
    action,
  });
