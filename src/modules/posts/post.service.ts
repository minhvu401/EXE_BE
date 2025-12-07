/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unnecessary-type-assertion */
import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Post } from './schema/post.schema';
import { User } from '../auth/schemas/user.schema';
import { CreatePostDto } from './dto/create-post.dto';
import { Role } from '../auth/enum/role.enum';

@Injectable()
export class PostService {
  constructor(
    @InjectModel(Post.name) private postModel: Model<Post>,
    @InjectModel(User.name) private userModel: Model<User>,
  ) {}

  async createPost(
    clubId: string,
    createPostDto: CreatePostDto,
  ): Promise<{ message: string; post: Post }> {
    const club = await this.userModel.findById(clubId);
    if (!club || club.role !== Role.CLUB) {
      throw new ForbiddenException(
        'Chỉ các câu lạc bộ mới có quyền tạo bài viết',
      );
    }

    const post = await this.postModel.create({
      clubId: new Types.ObjectId(clubId),
      title: createPostDto.title,
      tags: createPostDto.tags,
      content: createPostDto.content,
      images: createPostDto.images || [],
      like: 0,
      likedBy: [],
      isActive: true,
    });

    if (!club.posts) {
      club.posts = [];
    }

    club.posts.push({
      postId: post._id as Types.ObjectId,
      title: post.title,
      tags: post.tags,
      content: post.content,
      images: post.images,
      like: post.like,
      isActive: post.isActive,
      createdAt: post.createdAt,
    });
    await club.save();

    return {
      message: 'Tạo bài viết thành công',
      post,
    };
  }

  async getAllPosts(
    clubId?: string,
    sortBy: 'newest' | 'oldest' | 'popular' = 'newest',
    limit: number = 20,
    skip: number = 0,
  ) {
    {
      const filter: any = { isActive: true };

      if (clubId) {
        filter.clubId = new Types.ObjectId(clubId);
      }

      let sortOption: any = {};

      switch (sortBy) {
        case 'oldest':
          sortOption = { createdAt: 1 }; // Cũ nhất đến mới nhất
          break;
        case 'popular':
          sortOption = { like: -1, createdAt: -1 }; // Nhiều like nhất
          break;
        case 'newest':
        default:
          sortOption = { createdAt: -1 }; // Mới nhất đến cũ nhất
          break;
      }

      const posts = await this.postModel
        .find(filter)
        .populate('clubId', 'fullName avatarUrl category rating')
        .sort(sortOption)
        .limit(limit)
        .skip(skip)
        .exec();

      const total = await this.postModel.countDocuments(filter);

      return {
        total,
        posts,
        hasMore: skip + posts.length < total,
      };
    }
  }

  async checkUserLiked(userId: string, postId: string): Promise<boolean> {
    const post = await this.postModel.findById(postId);
    if (!post) return false;

    return post.likedBy.some((like) => like.userId.toString() === userId);
  }
  // Get posts with user's like status
  async getPostsWithLikeStatus(
    userId: string,
    clubId?: string,
    sortBy: 'newest' | 'oldest' | 'popular' = 'newest',
    limit: number = 20,
    skip: number = 0,
  ) {
    const result = await this.getAllPosts(clubId, sortBy, limit, skip);

    // Add isLiked field for each post
    const postsWithLikeStatus = await Promise.all(
      result.posts.map(async (post) => {
        const isLiked = await this.checkUserLiked(userId, post._id.toString());
        return {
          ...post.toObject(),
          isLiked,
        };
      }),
    );

    return {
      total: result.total,
      posts: postsWithLikeStatus,
      hasMore: result.hasMore,
    };
  }
}
