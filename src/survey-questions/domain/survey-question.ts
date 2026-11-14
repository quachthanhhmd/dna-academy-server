import { Lecture } from '../../lectures/domain/lecture';
import { Exclude } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class SurveyQuestion {
  @ApiProperty({
    type: () => Lecture,
    nullable: false,
  })
  lecture: Lecture;

  @Exclude({ toPlainOnly: true })
  archivedAt?: Date | null;

  @ApiProperty({
    type: () => String,
    nullable: true,
  })
  ratingLabelMax?: string | null;

  @ApiProperty({
    type: () => String,
    nullable: true,
  })
  ratingLabelMin?: string | null;

  @ApiProperty({
    type: () => Number,
    nullable: true,
  })
  ratingMax?: number | null;

  @ApiProperty({
    type: () => Number,
    nullable: false,
  })
  displayOrder: number;

  @ApiProperty({
    type: () => Boolean,
    nullable: false,
  })
  isRequired: boolean;

  @ApiProperty({
    type: () => String,
    nullable: false,
  })
  questionText: string;

  @ApiProperty({
    type: () => String,
    nullable: false,
  })
  questionType: string;

  @ApiProperty({
    type: String,
  })
  id: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
