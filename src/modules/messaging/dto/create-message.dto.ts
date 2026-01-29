import { IsString, IsNotEmpty, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateMessageDto {
  @ApiProperty({ example: 'recipient_user_id' })
  @IsString()
  @IsNotEmpty()
  recipientId: string;

  @ApiProperty({ example: 'Hello, how are you?' })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  content: string;
}
