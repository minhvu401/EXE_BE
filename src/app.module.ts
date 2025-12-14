/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import { Module } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static'; // Import mới
import { join } from 'path'; // Để join path
import { EventEmitterModule } from '@nestjs/event-emitter';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import jwtConfig from './config/jwt.config';
import { AuthModule } from './modules/auth/auth.module';
import { UserModule } from './modules/auth/user.module';
import { ApplicationModule } from './modules/applications/application.module';
import { PostModule } from './modules/posts/post.module';

@Module({
  imports: [
    EventEmitterModule.forRoot(),
    MongooseModule.forRoot(
      'mongodb+srv://minhvhse182677:Ntqnvhm%401008@cluster0.s3vm5.mongodb.net/EXE_DB',
    ),
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      load: [jwtConfig],
    }),
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'assets'), // Dùng process.cwd() thay vì __dirname
      serveRoot: '/assets',
    }),
    AuthModule,
    ApplicationModule,
    UserModule,
    PostModule,
  ],
  providers: [],
  controllers: [],
  exports: [],
})
export class AppModule {}
