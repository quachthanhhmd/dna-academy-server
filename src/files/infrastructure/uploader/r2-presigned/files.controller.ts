import { Body, Controller, Post, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { FilesR2PresignedService } from './files.service';
import { FileUploadDto } from './dto/file.dto';
import { FileResponseDto } from './dto/file-response.dto';
import {
  ApiUploadPurposeQuery,
  uploadPurposeOf,
} from '../../../storage/upload-purpose';

@ApiTags('Files')
@Controller({
  path: 'files',
  version: '1',
})
export class FilesR2PresignedController {
  constructor(private readonly filesService: FilesR2PresignedService) {}

  @ApiCreatedResponse({
    type: FileResponseDto,
  })
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @Post('upload')
  @ApiUploadPurposeQuery()
  async uploadFile(
    @Body() file: FileUploadDto,
    @Request() request,
  ): Promise<FileResponseDto> {
    return this.filesService.create(file, {
      purpose: uploadPurposeOf(request),
      uploadedById: request.user?.id,
    });
  }
}
