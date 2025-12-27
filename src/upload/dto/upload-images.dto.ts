// upload-images.dto.ts
import { ApiProperty } from '@nestjs/swagger';

export class UploadImagesDto {
  @ApiProperty({
    type: 'array',
    items: {
      type: 'string',
      format: 'binary',
    },
    description: 'Multiple image files',
  })
  files: any[];
}
