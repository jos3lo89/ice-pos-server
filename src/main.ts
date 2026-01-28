import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import cookieParser from 'cookie-parser';
import { Logger, ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'debug', 'log', 'fatal', 'verbose'],
  });
  app.use(cookieParser());

  const logger = new Logger('bootstrap');

  const configService = app.get(ConfigService);

  const corsOrigins = configService
    .get<string>('CORS_ORIGINS', '')
    .split(',')
    .map((origin) => origin.trim());

  const isProd = configService.get('NODE_ENV') === 'production';

  app.enableCors({
    origin: isProd ? corsOrigins : true,
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const apiPrefix = configService.get<string>('API_PREFIX', 'api/v1');
  app.setGlobalPrefix(apiPrefix, {
    exclude: ['health'],
  });

  app.enableShutdownHooks();

  const port = configService.get<number>('PORT', 5000);
  const nodeEnv = configService.get<string>('NODE_ENV');
  await app.listen(port);

  logger.log(
    `🚀 Application is running on: ${await app.getUrl()}, NODE_ENV: ${nodeEnv},`,
  );
}

bootstrap().catch((err) => {
  console.error(err);
  process.exit(1);
});
