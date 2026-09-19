import { PickType } from '@nestjs/swagger';
import { UpdateUserDto } from '../../users/dto/update-user.dto';

/**
 * What `PATCH /users/:id` may change (permission model §1.6): profile fields
 * only. Role goes through `PUT /admin/users/:id/roles`, account state through
 * `PATCH /users/:id/status`, and email and password belong to the account's
 * owner. Anything else in the body is stripped by the validation pipe.
 */
export class AdminUpdateUserDto extends PickType(UpdateUserDto, [
  'firstName',
  'lastName',
  'fullName',
  'photo',
  'profilePictureUrl',
  'age',
  'dateOfBirth',
  'locale',
] as const) {}
