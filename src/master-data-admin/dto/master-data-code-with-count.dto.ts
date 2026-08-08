import { ApiProperty } from '@nestjs/swagger';
import { MasterDataCode } from '../../master-data-codes/domain/master-data-code';

export class MasterDataCodeWithCountDto extends MasterDataCode {
  @ApiProperty({ type: () => Number })
  linkedCoursesCount: number;
}
