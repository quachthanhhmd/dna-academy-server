import './load-env';
import {
  ClassSerializerInterceptor,
  ValidationPipe,
  VersioningType,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory, Reflector } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import compression from 'compression';
import helmet from 'helmet';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { useContainer } from 'class-validator';
import { AppModule } from './app.module';
import validationOptions from './utils/validation-options';
import { AllConfigType } from './config/config.type';
import { ResolvePromisesInterceptor } from './utils/serializer.interceptor';

async function bootstrap() {
  // An allowlist, not `cors: true`. `true` reflects whatever Origin the
  // caller sends, so any site could call this API from a visitor's browser.
  // Comma-separated, so a staging front end can be added without code.
  const allowedOrigins = (process.env.FRONTEND_DOMAIN ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (process.env.NODE_ENV === 'production' && allowedOrigins.length === 0) {
    throw new Error(
      'FRONTEND_DOMAIN must list the front end origins in production; ' +
        'without it CORS would have to be open to every site.',
    );
  }

  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    // Outside production there is no deployed front end to name, and the e2e
    // suite calls the API from several origins.
    cors:
      allowedOrigins.length > 0
        ? { origin: allowedOrigins, credentials: true }
        : true,
  });

  app.use(
    helmet({
      // The API serves JSON and, with FILE_DRIVER=local, uploaded files. It
      // renders no HTML of its own, so a CSP here would only govern Swagger —
      // which production does not mount. The front end sets its own.
      contentSecurityPolicy: false,
      // Uploaded files are fetched by the Next.js app on another origin.
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );
  app.use(compression());

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

  // Swagger describes every route, field and validation rule. That is a map
  // for anyone probing the API, so production does not serve it unless
  // somebody deliberately asks — and then it belongs behind the proxy's auth.
  const swaggerEnabled =
    process.env.NODE_ENV !== 'production' ||
    process.env.SWAGGER_ENABLED === 'true';

  if (swaggerEnabled) {
    const document = SwaggerModule.createDocument(app, options);
    SwaggerModule.setup('docs', app, document);
  }

  await app.listen(configService.getOrThrow('app.port', { infer: true }));
}
void bootstrap();
