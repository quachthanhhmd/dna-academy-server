import { ApiProperty } from '@nestjs/swagger';
import { User } from '../../users/domain/user';
import { StudentProfile } from '../../student-profiles/domain/student-profile';
import { StudentCareerInterest } from '../../student-career-interests/domain/student-career-interest';

export class ProfileResponseDto {
  @ApiProperty({ type: () => User })
  user: User;

  @ApiProperty({ type: () => StudentProfile, nullable: true })
  studentProfile: StudentProfile | null;

  @ApiProperty({ type: () => [StudentCareerInterest] })
  careerInterests: StudentCareerInterest[];
}
