import { PartialType } from '@nestjs/swagger';
import { CreateSectionAdminDto } from './create-section-admin.dto';

export class UpdateSectionAdminDto extends PartialType(CreateSectionAdminDto) {}
