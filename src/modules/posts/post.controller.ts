import {
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  ParseIntPipe,
  Post,
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
}
