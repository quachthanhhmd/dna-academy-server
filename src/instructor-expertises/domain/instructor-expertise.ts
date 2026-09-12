import { ApiProperty } from '@nestjs/swagger';
import { MasterDataCode } from '../../master-data-codes/domain/master-data-code';
import { Instructor } from '../../instructors/domain/instructor';

export class InstructorExpertise {
  @ApiProperty({
    type: () => Instructor,
    nullable: false,
  })
  instructor: Instructor;

  @ApiProperty({
    type: () => MasterDataCode,
    nullable: false,
    description: 'master_data_code within the expertise_area group.',
  })
  expertiseCode: MasterDataCode;

  @ApiProperty({
    type: String,
  })
  id: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
