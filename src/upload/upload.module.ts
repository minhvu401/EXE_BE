import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { UploadService } from './upload.service';
import { CloudinaryProvider } from '../config/cloudinary.config';
@Module({
  imports: [ConfigModule],
  providers: [UploadService, CloudinaryProvider],
  exports: [UploadService],
})
export class UploadModule {}
