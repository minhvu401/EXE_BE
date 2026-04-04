import { IsString, IsNotEmpty, IsArray } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AddMembersDto {
  @ApiProperty({ example: ['user_id_1', 'user_id_2'] })
  @IsArray()
  @IsNotEmpty()
  memberIds: string[];
}

export class RemoveMemberDto {
  @ApiProperty({ example: 'user_id' })
  @IsString()
  @IsNotEmpty()
  memberId: string;
}

export class UpdateConversationDto {
  @ApiProperty({ example: 'New Group Name', required: false })
  @IsString()
  @IsNotEmpty()
  name?: string;

  @ApiProperty({ example: 'New group description', required: false })
  @IsString()
  @IsNotEmpty()
  description?: string;
}
