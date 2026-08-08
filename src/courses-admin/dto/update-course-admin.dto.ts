import { PartialType } from '@nestjs/swagger';
import { CreateCourseAdminDto } from './create-course-admin.dto';

export class UpdateCourseAdminDto extends PartialType(CreateCourseAdminDto) {}
