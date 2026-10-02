import {
  Controller,
  Post,
  Request,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { FilesR2Service } from './files.service';
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
export class FilesR2Controller {
  constructor(private readonly filesService: FilesR2Service) {}

  @ApiCreatedResponse({
    type: FileResponseDto,
  })
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @Post('upload')
  @ApiUploadPurposeQuery()
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFile() file: Express.MulterS3.File,
    @Request() request,
  ): Promise<FileResponseDto> {
    return this.filesService.create(file, {
      purpose: uploadPurposeOf(request),
      uploadedById: request.user?.id,
    });
  }
}
