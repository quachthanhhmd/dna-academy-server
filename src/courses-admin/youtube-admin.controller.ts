import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { PermissionGuard } from '../authorization/permission.guard';
import { RequirePermission } from '../authorization/require-permission.decorator';
import { YoutubeService } from '../youtube/youtube.service';
import {
  YoutubeDurationQueryDto,
  YoutubeDurationResponseDto,
} from './dto/youtube-duration-query.dto';

@ApiTags('Admin / Courses')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), PermissionGuard)
@Controller({
  path: 'admin/youtube',
  version: '1',
})
export class YoutubeAdminController {
  constructor(private readonly youtubeService: YoutubeService) {}

  @ApiOperation({
    summary: "Read a YouTube video's length, to prefill a lecture duration",
    description:
      'Not tied to a course: the editor calls it as soon as a link is ' +
      'pasted, before anything is saved. A duration that cannot be read is ' +
      'a 200 with durationSecs null and a reason, so the editor falls back ' +
      'to manual entry.',
  })
  @RequirePermission('courses', 'edit')
  @Get('duration')
  @ApiOkResponse({ type: YoutubeDurationResponseDto })
  @ApiUnprocessableEntityResponse({ description: 'Not a YouTube video link' })
  getDuration(@Query() query: YoutubeDurationQueryDto) {
    return this.youtubeService.getDuration(query.url);
  }
}
