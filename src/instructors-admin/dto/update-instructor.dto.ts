import { PartialType } from '@nestjs/swagger';
import { CreateInstructorDto } from './create-instructor.dto';

// PUT semantics: expertiseCodeIds / socialLinks replace the whole set when
// present, and are left untouched when omitted. An empty array clears the set.
export class UpdateInstructorDto extends PartialType(CreateInstructorDto) {}
