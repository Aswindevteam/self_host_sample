import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import chalk from 'chalk';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);
  app.enableCors();
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );
  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  logger.log(
    chalk.bold.green('🚀 LaunchPad Service is fully operational! ') +
      chalk.gray('Listening on: ') +
      chalk.cyan.bold.underline(`http://localhost:${port}`),
  );
}
bootstrap();

