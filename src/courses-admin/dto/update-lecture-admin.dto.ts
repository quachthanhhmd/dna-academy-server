import { PartialType } from '@nestjs/swagger';
import { CreateLectureAdminDto } from './create-lecture-admin.dto';

export class UpdateLectureAdminDto extends PartialType(CreateLectureAdminDto) {}
