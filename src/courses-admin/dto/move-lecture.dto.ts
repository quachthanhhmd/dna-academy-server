import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsString } from 'class-validator';

export class MoveLectureDto {
  @ApiProperty({ description: 'Section id to move the lecture into.' })
  @IsNotEmpty()
  @IsString()
  targetSectionId: string;

  @ApiProperty()
  @IsInt()
  displayOrder: number;
}
