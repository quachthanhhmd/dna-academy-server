// Don't forget to use the class-validator decorators in the DTO properties.
// import { Allow } from 'class-validator';

import { PartialType } from '@nestjs/swagger';
import { CreateUserRoleDto } from './create-user-role.dto';

export class UpdateUserRoleDto extends PartialType(CreateUserRoleDto) {}
