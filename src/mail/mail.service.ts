import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { I18nContext } from 'nestjs-i18n';
import { MailData } from './interfaces/mail-data.interface';

import { MaybeType } from '../utils/types/maybe.type';
import { MailerService } from '../mailer/mailer.service';
import path from 'path';
import { AllConfigType } from '../config/config.type';

@Injectable()
export class MailService {
  constructor(
    private readonly mailerService: MailerService,
    private readonly configService: ConfigService<AllConfigType>,
  ) {}

  /**
   * Absolute URL of the brand mark, served by the Next client from its
   * `public/brand/` folder.
   *
   * It has to be a PNG at an absolute URL: Gmail strips <svg> outright and
   * Outlook renders it as nothing, and every mail client fetches images over
   * the network with no page to resolve a relative path against.
   *
   * Each template pairs it with alt="{{app_name}}", so the many clients that
   * block remote images by default still show the brand name as text.
   */
  private logoUrl(): string {
    const frontendDomain = this.configService.getOrThrow('app.frontendDomain', {
      infer: true,
    });
    return new URL('/brand/careerdna-icon.png', frontendDomain).toString();
  }

  /**
   * The name to put in front of a learner, for subject lines and body copy.
   *
   * Deliberately `mail.defaultName` rather than `app.name`: the former is
   * already the From display name, so the subject and the sender agree, and
   * `app.name` is "DNA Academy API" in env/.env.example — correct for a
   * service, wrong for anything a person reads.
   */
  private brandName(): string {
    return (
      this.configService.get('mail.defaultName', { infer: true }) ??
      this.configService.get('app.name', { infer: true }) ??
      'DNA Academy'
    );
  }

  /**
   * The inbox line and the button label for one email.
   *
   * These used to be a single i18n value, which is why every subject read
   * like a button ("Confirm email"): the same short imperative was doing both
   * jobs. They have opposite requirements — a subject competes for attention
   * in a crowded inbox and needs the brand and the outcome, a button needs
   * two or three words — so each template namespace now owns both.
   */
  private async mailCopy(
    namespace: string,
  ): Promise<{ subject: MaybeType<string>; action: MaybeType<string> }> {
    const i18n = I18nContext.current();

    if (!i18n) {
      return { subject: undefined, action: undefined };
    }

    // The return generic is explicit because the key is built at runtime:
    // nestjs-i18n infers the value type from a literal key path, and a
    // template literal widens that to `unknown`.
    const [subject, action] = await Promise.all([
      i18n.t<string, string>(`${namespace}.subject`, {
        args: { appName: this.brandName() },
      }),
      i18n.t<string, string>(`${namespace}.action`),
    ]);

    return { subject, action };
  }

  async userSignUp(
    mailData: MailData<{ hash: string; firstName?: string }>,
  ): Promise<void> {
    const { subject, action } = await this.mailCopy('confirm-email');

    const url = new URL(
      this.configService.getOrThrow('app.frontendDomain', {
        infer: true,
      }) + '/confirm-email',
    );
    url.searchParams.set('hash', mailData.data.hash);

    await this.mailerService.sendMail({
      to: mailData.to,
      subject,
      text: `${url.toString()} ${subject}`,
      templatePath: path.join(
        this.configService.getOrThrow('app.workingDirectory', {
          infer: true,
        }),
        'src',
        'mail',
        'mail-templates',
        'activation.hbs',
      ),
      // The template runs Handlebars in strict mode, so every variable it
      // references must be present here. firstName falls back to the empty
      // string, which the template turns into the generic "Chào bạn".
      context: {
        title: subject,
        url: url.toString(),
        actionTitle: action,
        logo_url: this.logoUrl(),
        app_name: this.configService.get('app.name', { infer: true }),
        email: mailData.to,
        firstName: mailData.data.firstName ?? '',
      },
    });
  }

  async forgotPassword(
    mailData: MailData<{
      hash: string;
      tokenExpires: number;
      firstName?: string;
    }>,
  ): Promise<void> {
    const { subject, action } = await this.mailCopy('reset-password');

    const url = new URL(
      this.configService.getOrThrow('app.frontendDomain', {
        infer: true,
      }) + '/password-change',
    );
    url.searchParams.set('hash', mailData.data.hash);
    url.searchParams.set('expires', mailData.data.tokenExpires.toString());

    // Human-readable "when this was asked for" for the request-context box.
    // The api container runs on Asia/Ho_Chi_Minh (see docker-compose.yaml),
    // so Node's local formatting is Vietnam time without threading a zone
    // argument through here; the trailing tag makes that explicit.
    const requestedAt =
      new Date().toLocaleString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }) + ' (GMT+7)';

    await this.mailerService.sendMail({
      to: mailData.to,
      subject,
      text: `${url.toString()} ${subject}`,
      templatePath: path.join(
        this.configService.getOrThrow('app.workingDirectory', {
          infer: true,
        }),
        'src',
        'mail',
        'mail-templates',
        'reset-password.hbs',
      ),
      // Handlebars is in strict mode, so every var below must be here.
      context: {
        title: subject,
        url: url.toString(),
        actionTitle: action,
        logo_url: this.logoUrl(),
        app_name: this.configService.get('app.name', {
          infer: true,
        }),
        email: mailData.to,
        firstName: mailData.data.firstName ?? '',
        requestedAt,
      },
    });
  }

  /**
   * Permission model §1.7 — the "set your password" email for an instructor
   * account an admin created. It lands on the reset page; `invite=1` lets the
   * client word it as a first password rather than a reset (FE-9).
   */
  async instructorInvite(
    mailData: MailData<{ hash: string; tokenExpires: number }>,
  ): Promise<void> {
    const i18n = I18nContext.current();
    const { subject, action } = await this.mailCopy('instructor-invite');
    let text1: MaybeType<string>;
    let text2: MaybeType<string>;
    let text3: MaybeType<string>;
    let text4: MaybeType<string>;

    if (i18n) {
      [text1, text2, text3, text4] = await Promise.all([
        i18n.t('instructor-invite.text1'),
        i18n.t('instructor-invite.text2'),
        i18n.t('instructor-invite.text3'),
        i18n.t('instructor-invite.text4'),
      ]);
    }

    const url = new URL(
      this.configService.getOrThrow('app.frontendDomain', {
        infer: true,
      }) + '/password-change',
    );
    url.searchParams.set('hash', mailData.data.hash);
    url.searchParams.set('expires', mailData.data.tokenExpires.toString());
    url.searchParams.set('invite', '1');

    await this.mailerService.sendMail({
      to: mailData.to,
      subject,
      text: `${url.toString()} ${subject}`,
      templatePath: path.join(
        this.configService.getOrThrow('app.workingDirectory', {
          infer: true,
        }),
        'src',
        'mail',
        'mail-templates',
        'reset-password.hbs',
      ),
      context: {
        title: subject,
        url: url.toString(),
        actionTitle: action,
        logo_url: this.logoUrl(),
        app_name: this.configService.get('app.name', {
          infer: true,
        }),
        text1,
        text2,
        text3,
        text4,
      },
    });
  }

  async confirmNewEmail(mailData: MailData<{ hash: string }>): Promise<void> {
    const i18n = I18nContext.current();
    const { subject, action } = await this.mailCopy('confirm-new-email');
    let text1: MaybeType<string>;
    let text2: MaybeType<string>;
    let text3: MaybeType<string>;

    if (i18n) {
      [text1, text2, text3] = await Promise.all([
        i18n.t('confirm-new-email.text1'),
        i18n.t('confirm-new-email.text2'),
        i18n.t('confirm-new-email.text3'),
      ]);
    }

    const url = new URL(
      this.configService.getOrThrow('app.frontendDomain', {
        infer: true,
      }) + '/confirm-new-email',
    );
    url.searchParams.set('hash', mailData.data.hash);

    await this.mailerService.sendMail({
      to: mailData.to,
      subject,
      text: `${url.toString()} ${subject}`,
      templatePath: path.join(
        this.configService.getOrThrow('app.workingDirectory', {
          infer: true,
        }),
        'src',
        'mail',
        'mail-templates',
        'confirm-new-email.hbs',
      ),
      context: {
        title: subject,
        url: url.toString(),
        actionTitle: action,
        logo_url: this.logoUrl(),
        app_name: this.configService.get('app.name', { infer: true }),
        text1,
        text2,
        text3,
      },
    });
  }
}
