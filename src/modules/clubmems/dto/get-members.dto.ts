import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsEnum, IsString } from 'class-validator';
import { MemberRole } from '../enum/role.enum';

export class GetMembersQueryDto {
  @ApiProperty({
    required: false,
    enum: ['active', 'inactive', 'all'],
    description: 'Filter theo trạng thái',
  })
  @IsOptional()
  @IsEnum(['active', 'inactive', 'all'])
  status?: 'active' | 'inactive' | 'all';

  @ApiProperty({
    required: false,
    enum: MemberRole,
    description: 'Filter theo role',
  })
  @IsOptional()
  @IsEnum(MemberRole)
  role?: MemberRole;

  @ApiProperty({
    required: false,
    description: 'Tìm kiếm theo tên hoặc email',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({
    required: false,
    enum: ['newest', 'oldest', 'name'],
    description: 'Sắp xếp',
  })
  @IsOptional()
  @IsEnum(['newest', 'oldest', 'name'])
  sortBy?: 'newest' | 'oldest' | 'name';
}
