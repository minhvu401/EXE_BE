/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as admin from 'firebase-admin';
import * as path from 'path';
const serviceAccount = path.join(
  process.cwd(),
  'src',
  'config',
  'exe-firebase.json',
);
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('CLUBVERSE SERVICE API')
    .setDescription('API cho dự án Clubverse')
    .setVersion('1.0.0')
    .addBearerAuth({
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
      name: 'Authorization',
      description: 'Enter JWT token',
      in: 'header',
    })
    .build();

  // Cast app to any to work around mismatched @nestjs/common types installed in different node_modules paths
  const document = SwaggerModule.createDocument(app as any, config);
  SwaggerModule.setup('api', app as any, document, {
    customCssUrl: '/api/swagger-ui.css',
    customJs: [
      '/api/swagger-ui-bundle.js',
      '/api/swagger-ui-standalone-preset.js',
    ],
  });
  app.enableCors({
    origin: '*',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });
  try {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    console.log('Firebase Admin khởi tạo thành công!');
  } catch (error) {
    console.error('Lỗi:', error);
  }
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
