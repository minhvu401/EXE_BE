import { IsString, MinLength, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateMessageDto {
  @ApiProperty({ example: 'Updated message content' })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  content: string;
}
