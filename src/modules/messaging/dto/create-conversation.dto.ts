import {
  IsString,
  IsNotEmpty,
  IsArray,
  ArrayMinSize,
  IsOptional,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateConversationDto {
  @ApiProperty({ example: ['user_id_1', 'user_id_2'] })
  @IsArray()
  @ArrayMinSize(2)
  participantIds: string[];

  @ApiProperty({ example: 'Project Discussion', required: false })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ example: 'Discussing project updates', required: false })
  @IsString()
  @IsOptional()
  description?: string;
}
