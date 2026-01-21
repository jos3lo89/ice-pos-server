import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);

  app.enableShutdownHooks();

  const port = configService.get<number>('PORT', 5000);
  const nodeEnv = configService.get<string>('NODE_ENV');
  await app.listen(port);
  console.log(
    `🚀 Application is running on: http://localhost:${port}, NODE_ENV: ${nodeEnv}`,
  );
}
bootstrap();
