import { Body, Controller, Post, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { FilesS3PresignedService } from './files.service';
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
export class FilesS3PresignedController {
  constructor(private readonly filesService: FilesS3PresignedService) {}

  @ApiCreatedResponse({
    type: FileResponseDto,
  })
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @Post('upload')
  @ApiUploadPurposeQuery()
  async uploadFile(@Body() file: FileUploadDto, @Request() request) {
    return this.filesService.create(file, {
      purpose: uploadPurposeOf(request),
      uploadedById: request.user?.id,
    });
  }
}
