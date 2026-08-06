import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class MasterDataGroupDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  id: string;
}
