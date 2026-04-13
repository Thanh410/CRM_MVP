import { NestFactory, Reflector } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { Logger } from 'nestjs-pino';
import helmet from 'helmet';
import * as cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TraceIdInterceptor } from './common/interceptors/trace-id.interceptor';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  const configService = app.get(ConfigService);
  const port = configService.get<number>('port', 3000);
  const frontendUrl = configService.get<string>('frontendUrl', 'http://localhost:3001');

  // Structured logging
  app.useLogger(app.get(Logger));

  // Security headers
  app.use(helmet());

  // Cookie parser (for refresh token cookie)
  app.use(cookieParser());

  // CORS — allow LAN IP, ngrok, and any dev origin
  const allowedOrigins = [frontendUrl, 'http://localhost:3001', 'https://crm-web-blue.vercel.app'];
  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, Postman)
      if (!origin) return callback(null, true);
      // Allow configured origins
      if (allowedOrigins.includes(origin)) return callback(null, true);
      // Allow LAN IPs (192.168.x.x, 10.x.x.x, 172.16-31.x.x)
      if (/^https?:\/\/(192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)/.test(origin)) return callback(null, true);
      // Allow ngrok
      if (/\.ngrok(-free)?\.app$/.test(new URL(origin).hostname)) return callback(null, true);
      // Block others in production, allow all in dev
      if (process.env.NODE_ENV !== 'production') return callback(null, true);
      callback(new Error(`CORS blocked: ${origin}`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Trace-Id'],
  });

  // Global prefix
  app.setGlobalPrefix('api');

  // Trace ID – must be before exception filter
  app.useGlobalInterceptors(app.get(TraceIdInterceptor));

  // Exception filter
  app.useGlobalFilters(app.get(HttpExceptionFilter));

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Swagger
  const swaggerConfig = new DocumentBuilder()
    .setTitle('CRM MVP API')
    .setDescription('Production-ready CRM REST API for Vietnamese SME')
    .setVersion('1.0.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      'access-token',
    )
    .addTag('Auth', 'Authentication')
    .addTag('Users', 'User management')
    .addTag('Organizations', 'Org, department, team management')
    .addTag('RBAC', 'Roles & permissions')
    .addTag('Leads', 'Lead management')
    .addTag('Contacts', 'Contact management')
    .addTag('Companies', 'Company management')
    .addTag('Deals', 'Deal pipeline')
    .addTag('Tasks', 'Task & project management')
    .addTag('Marketing', 'Campaigns & templates')
    .addTag('Conversations', 'Omnichannel inbox')
    .addTag('Reports', 'Dashboard & reporting')
    .addTag('Audit', 'Audit logs')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: { persistAuthorization: true },
  });

  await app.listen(port, '0.0.0.0');
  console.log(`🚀 CRM API running on http://0.0.0.0:${port}/api`);
  console.log(`📚 Swagger docs at http://localhost:${port}/api/docs`);
}

bootstrap();
