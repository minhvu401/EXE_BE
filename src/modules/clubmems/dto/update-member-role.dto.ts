import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsEnum } from 'class-validator';
import { MemberRole } from '../enum/role.enum';

export class UpdateMemberRoleDto {
  @ApiProperty({
    example: '507f1f77bcf86cd799439011',
    description: 'ID của member',
  })
  @IsNotEmpty({ message: 'User ID is required' })
  @IsString()
  userId: string;

  @ApiProperty({
    enum: MemberRole,
    example: MemberRole.MODERATOR,
    description: 'Role mới của member',
  })
  @IsEnum(MemberRole)
  @IsNotEmpty()
  newRole: MemberRole;
}
