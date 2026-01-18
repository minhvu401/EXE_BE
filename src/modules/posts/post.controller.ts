import {
  Body,
  Controller,
  DefaultValuePipe,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { PostService } from './post.service';
import { Roles } from '../auth/decorators/role.decorator';
import { Role } from '../auth/enum/role.enum';
import { CurrentUser } from '../auth/decorators/currentUser.decorator';
import type { UserPayload } from '../auth/interface/user-payload.interface';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';

@ApiTags('Posts')
@Controller('posts')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('bearer')
export class PostController {
  constructor(private readonly postService: PostService) {}

  @Post()
  @Roles(Role.CLUB)
  @ApiOperation({ summary: 'Tạo bài viết mới (Club only)' })
  @ApiResponse({ status: 201, description: 'Tạo bài viết thành công' })
  @ApiResponse({ status: 403, description: 'Chỉ câu lạc bộ mới có thể tạo' })
  async createPost(
    @CurrentUser() user: UserPayload,
    @Body() createDto: CreatePostDto,
  ) {
    return this.postService.createPost(user.sub, createDto);
  }

  @Get()
  @Roles(Role.USER, Role.CLUB, Role.ADMIN)
  @ApiOperation({ summary: 'Lấy tất cả bài viết' })
  @ApiResponse({ status: 200, description: 'Lấy bài viết thành công' })
  @ApiResponse({ status: 403, description: 'Không có quyền truy cập' })
  @ApiQuery({
    name: 'clubId',
    required: false,
    description: 'Lọc theo câu lạc bộ',
  })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    enum: ['newest', 'oldest', 'popular'],
    description:
      'Sắp xếp: newest (mới nhất), oldest (cũ nhất), popular (phổ biến)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Số bài viết mỗi trang',
  })
  @ApiQuery({
    name: 'skip',
    required: false,
    type: Number,
    description: 'Bỏ qua số bài viết',
  })
  @ApiResponse({ status: 200, description: 'Lấy danh sách thành công' })
  async getAllPosts(
    @CurrentUser() user: UserPayload,
    @Query('clubId') clubId?: string,
    @Query('sortBy') sortBy: 'newest' | 'oldest' | 'popular' = 'newest',
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number = 20,
    @Query('skip', new DefaultValuePipe(0), ParseIntPipe) skip: number = 0,
  ) {
    return this.postService.getPostsWithLikeStatus(
      user.sub,
      clubId,
      sortBy,
      limit,
      skip,
    );
  }

  @Get('club/:clubId')
  @ApiOperation({ summary: 'Lấy danh sách bài viết của câu lạc bộ' })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    enum: ['newest', 'oldest', 'popular'],
  })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'skip', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Lấy danh sách thành công' })
  async getPostsByClub(
    @CurrentUser() user: UserPayload,
    @Param('clubId') clubId: string,
    @Query('sortBy') sortBy: 'newest' | 'oldest' | 'popular' = 'newest',
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number = 20,
    @Query('skip', new DefaultValuePipe(0), ParseIntPipe) skip: number = 0,
  ) {
    return this.postService.getPostsWithLikeStatus(
      user.sub,
      clubId,
      sortBy,
      limit,
      skip,
    );
  }

  @Get('deleted')
  @Roles(Role.CLUB)
  @ApiOperation({ summary: 'Xem danh sách bài viết đã xóa (Club only)' })
  @ApiResponse({ status: 200, description: 'Lấy danh sách thành công' })
  async getDeletedPosts(@CurrentUser() user: UserPayload) {
    return this.postService.getDeletedPosts(user.sub);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Xem chi tiết bài viết' })
  @ApiResponse({ status: 200, description: 'Lấy thông tin thành công' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy bài viết' })
  async getPostById(@Param('id') id: string) {
    return this.postService.getPostById(id);
  }

  @Patch(':id')
  @Roles(Role.CLUB)
  @ApiOperation({ summary: 'Cập nhật bài viết (club account only)' })
  @ApiResponse({ status: 200, description: 'Cập nhật thành công' })
  @ApiResponse({ status: 403, description: 'Không có quyền chỉnh sửa' })
  async updatePost(
    @CurrentUser() user: UserPayload,
    @Param('id') id: string,
    @Body() updateDto: UpdatePostDto,
  ) {
    return this.postService.updatePost(user.sub, id, updateDto);
  }

  @Delete(':id')
  @Roles(Role.CLUB)
  @ApiOperation({ summary: 'Xóa bài viết (Soft delete - club account only)' })
  @ApiResponse({ status: 200, description: 'Xóa thành công' })
  @ApiResponse({ status: 403, description: 'Không có quyền xóa' })
  async deletePost(@CurrentUser() user: UserPayload, @Param('id') id: string) {
    return this.postService.deletePost(user.sub, id);
  }

  @Patch(':id/restore')
  @Roles(Role.CLUB)
  @ApiOperation({ summary: 'Khôi phục bài viết đã xóa (club account only)' })
  @ApiResponse({ status: 200, description: 'Khôi phục thành công' })
  async restorePost(@CurrentUser() user: UserPayload, @Param('id') id: string) {
    return this.postService.restorePost(user.sub, id);
  }

  @Delete(':id/permanent')
  @Roles(Role.CLUB)
  @ApiOperation({ summary: 'Xóa vĩnh viễn bài viết (club account only)' })
  @ApiResponse({ status: 200, description: 'Xóa vĩnh viễn thành công' })
  @ApiResponse({ status: 403, description: 'Không có quyền xóa vĩnh viễn' })
  @ApiResponse({
    status: 400,
    description: 'Chỉ có thể xóa vĩnh viễn bài viết đã soft delete',
  })
  async hardDeletePost(
    @CurrentUser() user: UserPayload,
    @Param('id') id: string,
  ) {
    return this.postService.hardDeletePost(user.sub, id);
  }

  @Post(':id/like')
  @ApiOperation({ summary: 'Thích bài viết' })
  @ApiResponse({ status: 200, description: 'Đã thích bài viết' })
  @ApiResponse({ status: 400, description: 'Đã thích rồi' })
  async likePost(@CurrentUser() user: UserPayload, @Param('id') id: string) {
    return this.postService.likePost(user.sub, id);
  }

  @Delete(':id/unlike')
  @ApiOperation({ summary: 'Bỏ thích bài viết' })
  @ApiResponse({ status: 200, description: 'Đã bỏ thích bài viết' })
  @ApiResponse({ status: 400, description: 'Chưa thích bài viết này' })
  async unlikePost(@CurrentUser() user: UserPayload, @Param('id') id: string) {
    return this.postService.unlikePost(user.sub, id);
  }
}


