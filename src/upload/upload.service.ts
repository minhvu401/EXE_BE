/* eslint-disable @typescript-eslint/no-unnecessary-type-assertion */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
// upload.service.ts
import {
  Injectable,
  BadRequestException,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  v2 as cloudinary,
  UploadApiResponse,
  UploadApiErrorResponse,
} from 'cloudinary';
import { createReadStream } from 'streamifier';
import { Readable } from 'stream';

export enum UploadFolder {
  AVATARS = 'clubverse/avatars',
  POSTS = 'clubverse/posts',
  EVENTS = 'clubverse/events',
}

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);

  // Allowed image types
  private readonly allowedImageTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
  ];

  // Max file sizes (in bytes)
  private readonly MAX_AVATAR_SIZE = 5 * 1024 * 1024; // 5MB
  private readonly MAX_POST_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB

  constructor(private configService: ConfigService) {
    // Initialize Cloudinary with error checking
    const cloudName = this.configService.get<string>('CLOUDINARY_CLOUD_NAME');
    const apiKey = this.configService.get<string>('CLOUDINARY_API_KEY');
    const apiSecret = this.configService.get<string>('CLOUDINARY_API_SECRET');

    if (!cloudName || !apiKey || !apiSecret) {
      this.logger.warn(
        'Cloudinary configuration is missing. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET environment variables.',
      );
    }

    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
    });
  }

  // Ensure Cloudinary is configured before each operation
  private ensureCloudinaryConfigured(): void {
    const config = cloudinary.config();
    if (!config.api_key || !config.api_secret) {
      const cloudName = this.configService.get<string>('CLOUDINARY_CLOUD_NAME');
      const apiKey = this.configService.get<string>('CLOUDINARY_API_KEY');
      const apiSecret = this.configService.get<string>('CLOUDINARY_API_SECRET');

      cloudinary.config({
        cloud_name: cloudName,
        api_key: apiKey,
        api_secret: apiSecret,
      });
    }
  }

  // Validate image file
  private validateImage(file: Express.Multer.File, maxSize: number): void {
    if (!file) {
      throw new BadRequestException('Không có file được upload');
    }

    // Check file type
    if (!this.allowedImageTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        'Định dạng file không hợp lệ. Chỉ chấp nhận: JPEG, JPG, PNG, WEBP',
      );
    }

    // Check file size
    if (file.size > maxSize) {
      const maxSizeMB = maxSize / (1024 * 1024);
      throw new BadRequestException(`Kích thước file vượt quá ${maxSizeMB}MB`);
    }
  }

  // Upload single image to Cloudinary
  async uploadImage(
    file: Express.Multer.File,
    folder: UploadFolder,
    maxSize: number = this.MAX_POST_IMAGE_SIZE,
  ): Promise<string> {
    this.validateImage(file, maxSize);
    this.ensureCloudinaryConfigured();

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: folder,
          resource_type: 'image',
          transformation: [{ quality: 'auto:good' }, { fetch_format: 'auto' }],
        },
        (
          error: UploadApiErrorResponse | undefined,
          result: UploadApiResponse,
        ) => {
          if (error != null) {
            this.logger.error('Cloudinary upload error:', error);
            reject(new InternalServerErrorException('Upload ảnh thất bại'));
          } else if (result) {
            this.logger.log(
              `Image uploaded successfully: ${result.secure_url}`,
            );
            resolve(result.secure_url);
          }
        },
      );

      const readStream = createReadStream(file.buffer) as Readable;
      readStream.on('error', (streamError: Error) => {
        this.logger.error('Stream error:', streamError);
        reject(new InternalServerErrorException('Upload ảnh thất bại'));
      });
      readStream.pipe(uploadStream);
    });
  }

  // Upload multiple images
  async uploadMultipleImages(
    files: Express.Multer.File[],
    folder: UploadFolder,
    maxSize: number = this.MAX_POST_IMAGE_SIZE,
  ): Promise<string[]> {
    if (!files || files.length === 0) {
      throw new BadRequestException('Không có file được upload');
    }

    // Limit number of files
    if (files.length > 10) {
      throw new BadRequestException('Chỉ được upload tối đa 10 ảnh');
    }

    const uploadPromises = files.map((file) =>
      this.uploadImage(file, folder, maxSize),
    );

    try {
      const urls = await Promise.all(uploadPromises);
      return urls;
    } catch (error) {
      this.logger.error('Error uploading multiple images:', error);
      throw new InternalServerErrorException('Upload ảnh thất bại');
    }
  }

  // Upload avatar (with size restriction)
  async uploadAvatar(file: Express.Multer.File): Promise<string> {
    return this.uploadImage(file, UploadFolder.AVATARS, this.MAX_AVATAR_SIZE);
  }

  // Upload post images
  async uploadPostImages(files: Express.Multer.File[]): Promise<string[]> {
    return this.uploadMultipleImages(files, UploadFolder.POSTS);
  }

  // Upload event images
  async uploadEventImages(files: Express.Multer.File[]): Promise<string[]> {
    return this.uploadMultipleImages(files, UploadFolder.EVENTS);
  }

  // Delete image from Cloudinary
  async deleteImage(imageUrl: string): Promise<void> {
    try {
      // Extract public_id from URL
      const publicId = this.extractPublicId(imageUrl);

      if (!publicId) {
        this.logger.warn(`Cannot extract public_id from URL: ${imageUrl}`);
        return;
      }

      this.ensureCloudinaryConfigured();
      await cloudinary.uploader.destroy(publicId);
      this.logger.log(`Image deleted successfully: ${publicId}`);
    } catch (error) {
      this.logger.error('Error deleting image from Cloudinary:', error);
      // Don't throw error, just log it
    }
  }

  // Delete multiple images
  async deleteMultipleImages(imageUrls: string[]): Promise<void> {
    const deletePromises = imageUrls.map((url) => this.deleteImage(url));
    await Promise.all(deletePromises);
  }

  // Extract public_id from Cloudinary URL
  private extractPublicId(url: string): string | null {
    try {
      // Cloudinary URL format: https://res.cloudinary.com/{cloud_name}/image/upload/v{version}/{public_id}.{format}
      const urlParts = url.split('/');
      const uploadIndex = urlParts.indexOf('upload');

      if (uploadIndex === -1) return null;

      // Get everything after 'upload' and 'v{version}'
      const pathParts = urlParts.slice(uploadIndex + 2); // Skip 'upload' and version
      const publicIdWithExt = pathParts.join('/');

      // Remove file extension
      const publicId = publicIdWithExt.substring(
        0,
        publicIdWithExt.lastIndexOf('.'),
      );

      return publicId;
    } catch (error) {
      this.logger.error('Error extracting public_id:', error);
      return null;
    }
  }

  // Get image info
  async getImageInfo(publicId: string): Promise<any> {
    try {
      this.ensureCloudinaryConfigured();
      const result = await cloudinary.api.resource(publicId);
      return result;
    } catch (error) {
      this.logger.error('Error getting image info:', error);
      throw new BadRequestException('Không thể lấy thông tin ảnh');
    }
  }
}
