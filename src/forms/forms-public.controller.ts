import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiCreatedResponse,
  ApiHeader,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import {
  FormDefinitionDto,
  FormPrefillDto,
  FormSubmissionCreatedDto,
} from './dto/form-definition.dto';
import { CreateFormSubmissionDto } from './dto/create-form-submission.dto';
import { FormsService } from './forms.service';
import {
  RateLimit,
  RateLimitGuard,
} from '../utils/rate-limit/rate-limit.guard';
import { HOUR, MINUTE } from '../utils/rate-limit/rate-limit.constants';

/**
 * The public form surface (spec §4). No class-level guard: this app has no
 * global `APP_GUARD`, so a controller without `@UseGuards` is public by
 * construction.
 *
 * The definition route stays anonymous; the prefill route is a separate
 * authenticated `GET` rather than an optional-auth one, because there is no
 * "include prefill if a JWT happens to be present" without inventing an
 * optional-auth guard for a route that is otherwise public (spec §4).
 */
@ApiTags('Forms')
@Controller({ path: 'public/forms', version: '1' })
export class FormsPublicController {
  constructor(private readonly formsService: FormsService) {}

  @ApiOperation({
    summary: 'Public: the localised definition for a form (no auth)',
    description:
      'Sections → questions → each question’s narrowed allowlist → conditional questions carrying parentOptionCode. Honours X-Locale (vi default).',
  })
  @ApiHeader({ name: 'X-Locale', required: false, example: 'vi' })
  @ApiOkResponse({ type: FormDefinitionDto })
  @ApiNotFoundResponse({ description: 'Unknown or inactive form code' })
  @Get(':code')
  getDefinition(@Param('code') code: string): Promise<FormDefinitionDto> {
    return this.formsService.getPublicDefinition(code);
  }

  @ApiOperation({
    summary: 'Authenticated: prefill values for a form',
    description:
      'The certificate overlay’s source of fullName/email/phone. A separate route from the definition because it needs a session and the definition does not.',
  })
  @ApiOkResponse({ type: FormPrefillDto })
  @UseGuards(AuthGuard('jwt'))
  @Get(':code/prefill')
  getPrefill(
    @Param('code') code: string,
    @Request()
    request: {
      user: {
        id: number;
        firstName?: string | null;
        lastName?: string | null;
        email?: string | null;
        phone?: string | null;
      };
    },
    @Query('courseId') courseId?: string,
  ): Promise<FormPrefillDto> {
    return this.formsService.getPrefill(code, request.user as never, courseId);
  }

  @ApiOperation({
    summary: 'Public: create a submission (no auth)',
    description:
      'Validated server-side independently of the client: option codes must be in this question’s allowlist, conditionals must be unlocked, `other` must carry its text, required consents must be present. Marks (never blocks) a filled honeypot or a sub-second fill.',
  })
  @ApiCreatedResponse({ type: FormSubmissionCreatedDto })
  @ApiUnprocessableEntityResponse({ description: 'Field-mapped errors' })
  @UseGuards(RateLimitGuard)
  // Per email and per IP, mirroring the login limiter. Shared NAT means the
  // IP budget is deliberately the looser of the two.
  @RateLimit(5, 10 * MINUTE, { body: 'email' })
  @RateLimit(30, HOUR, 'ip')
  @Post(':code/submissions')
  @HttpCode(HttpStatus.CREATED)
  createSubmission(
    @Param('code') code: string,
    @Body() dto: CreateFormSubmissionDto,
    @Request()
    request: {
      user?: { id: number } | null;
      ip?: string;
    },
    @Headers('user-agent') userAgent?: string,
  ): Promise<FormSubmissionCreatedDto> {
    return this.formsService.createSubmission(
      code,
      dto,
      request.user as never,
      request.ip,
      userAgent,
    );
  }
}
