import {
  IsString,
  IsNotEmpty,
  MinLength,
  IsOptional,
  IsArray,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateMessageDto {
  @ApiProperty({ example: 'conversation_id' })
  @IsString()
  @IsNotEmpty()
  conversationId: string;

  @ApiProperty({ example: 'Hello, how are you?' })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  content: string;

  @ApiProperty({ example: 'parent_message_id', required: false })
  @IsString()
  @IsOptional()
  parentMessageId?: string;

  @ApiProperty({
    example: [
      {
        url: 'https://...',
        type: 'image',
        name: 'photo.jpg',
      },
    ],
    required: false,
  })
  @IsArray()
  @IsOptional()
  attachments?: Array<{
    url: string;
    type: string;
    name: string;
    size?: number;
  }>;
}
