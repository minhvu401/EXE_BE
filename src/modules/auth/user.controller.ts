import {
  Controller,
  Body,
  Get,
  Param,
  Patch,
  UseGuards,
  Delete,
  Post,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { CurrentUser } from './decorators/currentUser.decorator';
import type { UserPayload } from './interface/user-payload.interface';
import { Roles } from './decorators/role.decorator';
import {
  UpdateStudentProfileDto,
  UpdateClubProfileDto,
} from './dto/update-profile.dto';
import { Role } from './enum/role.enum';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { UserService } from './user.service';
import { JwtAuthGuard } from './guards/jwt.guard';
import { RolesGuard } from './guards/roles.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { UploadAvatarDto } from 'src/upload/dto/upload-avatar.dto';

@ApiTags('User Management')
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}
  @Get('profile')
  @ApiOperation({ summary: 'Lấy thông tin profile của người dùng hiện tại' })
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  @ApiResponse({ status: 200, description: 'Lấy thông tin thành công' })
  async getMyProfile(@CurrentUser() user: UserPayload) {
    return this.userService.getUserProfile(user.sub);
  }

  @Get('clubs')
  @ApiOperation({ summary: 'Lấy danh sách tất cả câu lạc bộ' })
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  @ApiResponse({ status: 200, description: 'Lấy danh sách thành công' })
  async getAllClubs() {
    return this.userService.getAllClub();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy thông tin profile theo ID' })
  @ApiResponse({ status: 200, description: 'Lấy thông tin thành công' })
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  @ApiResponse({ status: 404, description: 'Không tìm thấy người dùng' })
  async getUserById(@Param('id') id: string) {
    return this.userService.getUserProfile(id);
  }

  @Patch('profile/student')
  @Roles(Role.USER)
  @ApiOperation({ summary: 'Cập nhật thông tin sinh viên' })
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  @ApiResponse({ status: 200, description: 'Cập nhật thành công' })
  @ApiResponse({
    status: 403,
    description: 'Chỉ sinh viên mới có thể cập nhật',
  })
  async updateStudentProfile(
    @CurrentUser() user: UserPayload,
    @Body() updateDto: UpdateStudentProfileDto,
  ) {
    return this.userService.updateStudentProfile(user.sub, updateDto);
  }

  @Patch('profile/club')
  @UseGuards(JwtAuthGuard)
  @Roles(Role.CLUB)
  @ApiOperation({ summary: 'Cập nhật thông tin câu lạc bộ' })
  @ApiBearerAuth('bearer')
  @ApiResponse({ status: 200, description: 'Cập nhật thành công' })
  @ApiResponse({
    status: 403,
    description: 'Chỉ câu lạc bộ mới có thể cập nhật',
  })
  async updateClubProfile(
    @CurrentUser() user: UserPayload,
    @Body() updateDto: UpdateClubProfileDto,
  ) {
    return this.userService.updateClubProfile(user.sub, updateDto);
  }

  @Get()
  @Roles(Role.ADMIN) // vẫn giữ để chỉ admin mới được gọi
  @ApiOperation({ summary: 'Lấy danh sách tất cả người dùng (Admin only)' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth('bearer')
  @ApiResponse({ status: 200, description: 'Lấy danh sách thành công' })
  @ApiResponse({ status: 403, description: 'Chỉ ADMIN mới có quyền truy cập' })
  async getAllUsers(@CurrentUser() currentUser: UserPayload) {
    // lấy user từ token
    return this.userService.getAllUsers(currentUser);
  }

  @ApiBearerAuth('bearer')
  @UseGuards(JwtAuthGuard)
  @ApiResponse({ status: 200, description: 'Vô hiệu hóa thành công' })
  @ApiResponse({
    status: 403,
    description: 'Không có quyền vô hiệu hóa tài khoản này',
  })
  async deactivateUser(
    @Param('id') id: string,
    @CurrentUser() user: UserPayload,
  ) {
    const isAdmin = user.role === Role.ADMIN;
    return this.userService.deactivateUser(id, user.sub, isAdmin);
  }

  @Delete(':id/deactivate')
  @ApiBearerAuth('bearer')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Vô hiệu hóa tài khoản người dùng (Admin only)' })
  @ApiResponse({ status: 200, description: 'Vô hiệu hóa thành công' })
  @ApiResponse({ status: 403, description: 'Chỉ ADMIN mới có quyền truy cập' })
  async adminDeactivateUser(
    @Param('id') id: string,
    @CurrentUser() user: UserPayload,
  ) {
    return this.userService.deactivateUser(id, user.sub, true);
  }

  @Patch(':id/reactivate')
  @ApiBearerAuth('bearer')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Kích hoạt lại tài khoản (Admin only)' })
  @ApiResponse({ status: 200, description: 'Kích hoạt lại thành công' })
  @ApiResponse({ status: 403, description: 'Chỉ ADMIN mới có quyền truy cập' })
  async reactivateUser(@Param('id') id: string) {
    return this.userService.reactivateUser(id);
  }

  @Post('avatar')
  @ApiBearerAuth('bearer')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload/Update avatar' })
  @ApiBody({ type: UploadAvatarDto })
  async uploadAvatar(
    @CurrentUser() user: UserPayload,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.userService.uploadAvatar(user.sub, file);
  }

  @Delete('avatar')
  @ApiBearerAuth('bearer')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Delete avatar' })
  async deleteAvatar(@CurrentUser() user: UserPayload) {
    return this.userService.deleteAvatar(user.sub);
  }
}
