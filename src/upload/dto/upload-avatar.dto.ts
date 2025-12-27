// upload-avatar.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator';

export class UploadAvatarDto {
  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: 'Avatar image file',
  })
  @IsNotEmpty()
  file: any;
}
