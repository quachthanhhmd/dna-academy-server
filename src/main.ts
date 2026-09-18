import './load-env';
import {
  ClassSerializerInterceptor,
  ValidationPipe,
  VersioningType,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory, Reflector } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { useContainer } from 'class-validator';
import { AppModule } from './app.module';
import validationOptions from './utils/validation-options';
import { AllConfigType } from './config/config.type';
import { ResolvePromisesInterceptor } from './utils/serializer.interceptor';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    cors: true,
  });

  // Behind a load balancer `request.ip` is the balancer's address, so every
  // client would share one rate-limit budget. APP_TRUST_PROXY names the proxies
  // to trust: a hop count (`1`) or their addresses/subnets. `true` is refused —
  // trusting any X-Forwarded-For lets a client pick its own IP.
  const trustProxy = process.env.APP_TRUST_PROXY?.trim();
  if (trustProxy && trustProxy !== 'false') {
    if (trustProxy === 'true') {
      throw new Error(
        'APP_TRUST_PROXY=true would let clients spoof their IP; set a hop count or proxy addresses',
      );
    }
    app.set(
      'trust proxy',
      /^\d+$/.test(trustProxy) ? Number(trustProxy) : trustProxy,
    );
  }
  useContainer(app.select(AppModule), { fallbackOnErrors: true });
  const configService = app.get(ConfigService<AllConfigType>);

  app.enableShutdownHooks();
  app.setGlobalPrefix(
    configService.getOrThrow('app.apiPrefix', { infer: true }),
    {
      exclude: ['/'],
    },
  );
  app.enableVersioning({
    type: VersioningType.URI,
  });
  app.useGlobalPipes(new ValidationPipe(validationOptions));
  app.useGlobalInterceptors(
    // ResolvePromisesInterceptor is used to resolve promises in responses because class-transformer can't do it
    // https://github.com/typestack/class-transformer/issues/549
    new ResolvePromisesInterceptor(),
    new ClassSerializerInterceptor(app.get(Reflector)),
  );

  const options = new DocumentBuilder()
    .setTitle('DNA Academy API')
    .setDescription(
      [
        'DNA Academy backend API.',
        '',
        '- **Auth** — Epic 1: registration, email/Facebook login, student onboarding.',
        '- **Admin / Roles**, **Admin / Master Data** — Epic 2: roles, permissions and master data.',
        '- **Admin / Courses** — Epic 3: course authoring, curriculum and publishing.',
        '- **Course Catalog** — Epic 4: public course discovery, course overview and student enrollment.',
      ].join('\n'),
    )
    .setVersion('1.0')
    .addBearerAuth()
    .addGlobalParameters({
      in: 'header',
      required: false,
      name: process.env.APP_HEADER_LANGUAGE || 'x-custom-lang',
      schema: {
        example: 'en',
      },
    })
    .build();

  const document = SwaggerModule.createDocument(app, options);
  SwaggerModule.setup('docs', app, document);

  await app.listen(configService.getOrThrow('app.port', { infer: true }));
}
void bootstrap();
