import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, VersioningType, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT') || 3000;
  const env = configService.get<string>('NODE_ENV') || 'development';
  const apiPrefix = configService.get<string>('API_PREFIX') || 'api';
  
  // Security Headers
  app.use(helmet());

  // CORS
  const corsOrigin = configService.get<string>('CORS_ORIGIN');
  if (!corsOrigin) {
    throw new Error('CORS_ORIGIN environment variable is strictly required');
  }
  app.enableCors({ origin: corsOrigin });

  // Global Prefix & Versioning
  app.setGlobalPrefix(apiPrefix);
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  // Global Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Global Error Handling
  app.useGlobalFilters(new GlobalExceptionFilter());

  // Swagger OpenAPI Configuration
  if (env !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('ABOS Construction Management API')
      .setDescription('The canonical REST API for the ABOS Platform')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
  }

  await app.listen(port);
  logger.log(`ABOS API running on http://localhost:${port}/${apiPrefix}/v1`);
}
bootstrap();