/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
// user.service.ts
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from '../auth/schemas/user.schema';
import { ClubMember } from '../clubmems/schemas/club-member.schema';
import { UpdateStudentProfileDto } from './dto/update-profile.dto';
import { UpdateClubProfileDto } from './dto/update-profile.dto';
import { Role } from '../auth/enum/role.enum';
import { UserPayload } from './interface/user-payload.interface';
import { UploadService } from 'src/upload/upload.service';

@Injectable()
export class UserService {
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(ClubMember.name) private clubMemberModel: Model<ClubMember>,
    private uploadService: UploadService,
  ) {}

  // Get user profile by ID
  async getUserProfile(userId: string) {
    const user = await this.userModel
      .findById(userId)
      .select('-password')
      .exec();

    if (!user) {
      throw new NotFoundException('Không tìm thấy người dùng');
    }

    // Fetch clubs that this user has joined
    const clubsJoined: any[] = [];

    // Get all club members records
    const allClubMembers = await this.clubMemberModel.find().exec();

    // Search for this user in each club's members list
    for (const clubRecord of allClubMembers) {
      const userInClub = clubRecord.users?.find(
        (member: any) => member.userId.toString() === userId,
      );

      if (userInClub && userInClub.isActive) {
        // Get club information
        const club = await this.userModel
          .findById(clubRecord.clubId)
          .select('-password')
          .exec();

        if (club) {
          clubsJoined.push({
            clubId: clubRecord.clubId.toString(),
            clubName: club.fullName,
            category: club.category,
            clubAvatarUrl: club.avatarUrl,
            role: userInClub.role || 'member',
            joinedAt: userInClub.joinedAt,
            isActive: userInClub.isActive,
            outDate: userInClub.outDate,
          });
        }
      }
    }

    // Convert user to object and add clubs information
    const userObject = user.toObject();
    (userObject as any).clubsJoined = clubsJoined;

    return userObject;
  }

  // Update Student Profile
  async updateStudentProfile(
    userId: string,
    updateDto: UpdateStudentProfileDto,
  ) {
    const user = await this.userModel.findById(userId);

    if (!user) {
      throw new NotFoundException('Không tìm thấy người dùng');
    }

    if (user.role !== Role.USER && user.role !== Role.ADMIN) {
      throw new ForbiddenException(
        'Chỉ sinh viên hoặc ADMIN mới có thể cập nhật thông tin sinh viên',
      );
    }

    // Update fields
    Object.assign(user, updateDto);
    await user.save();

    // Return user without password
    const updatedUser = user.toObject();
    delete (updatedUser as any).password;

    return {
      message: 'Cập nhật thông tin thành công',
      user: updatedUser,
    };
  }

  // Update Club Profile
  async updateClubProfile(userId: string, updateDto: UpdateClubProfileDto) {
    const user = await this.userModel.findById(userId);

    if (!user) {
      throw new NotFoundException('Không tìm thấy người dùng');
    }

    if (user.role !== Role.CLUB && user.role !== Role.ADMIN) {
      throw new ForbiddenException(
        'Chỉ câu lạc bộ hoặc ADMIN mới có thể cập nhật thông tin câu lạc bộ',
      );
    }

    // Update fields
    Object.assign(user, updateDto);
    await user.save();

    // Return user without password
    const updatedUser = user.toObject();
    delete (updatedUser as any).password;

    return {
      message: 'Cập nhật thông tin câu lạc bộ thành công',
      user: updatedUser,
    };
  }

  // Get all users (Admin only)
  async getAllUsers(currentUser: UserPayload) {
    // Nếu bạn muốn ADMIN thấy hết, còn những role khác thì giới hạn
    const filter: any = {};

    // Ví dụ rule:
    if (currentUser.role !== Role.ADMIN) {
      // Nếu không phải admin → chỉ được xem user thường (hoặc throw lỗi)
      filter.role = Role.USER; // hoặc throw ForbiddenException()
      // Hoặc ném lỗi luôn cho chắc:
      // throw new ForbiddenException('Chỉ Admin mới được xem toàn bộ danh sách');
    }
    // ADMIN thì filter = {} → thấy hết

    const users = await this.userModel
      .find(filter)
      .select('-password -__v') // ẩn password và __v
      .sort({ createdAt: -1 }) // tuỳ chọn: mới nhất lên đầu
      .lean(); // nhanh hơn chút

    return {
      total: users.length,
      users,
    };
  }

  async getAllClub() {
    const clubs = await this.userModel
      .find({ role: Role.CLUB })
      .select('-password -__v') // ẩn password và __v
      .sort({ createdAt: -1 }) // tuỳ chọn: mới nhất lên đầu
      .lean(); // nhanh hơn chút

    return {
      total: clubs.length,
      clubs,
    };
  }
  // Deactivate user (Admin or self)
  async deactivateUser(
    userId: string,
    requestUserId: string,
    isAdmin: boolean,
  ) {
    const user = await this.userModel.findById(userId);

    if (!user) {
      throw new NotFoundException('Không tìm thấy người dùng');
    }

    // Check permission: Admin can deactivate anyone, user can deactivate self
    if (!isAdmin && userId !== requestUserId) {
      throw new ForbiddenException(
        'Bạn không có quyền vô hiệu hóa người dùng này',
      );
    }

    user.isActive = false;
    user.deletedAt = new Date();
    await user.save();

    return {
      message: 'Vô hiệu hóa tài khoản thành công',
    };
  }

  // Reactivate user (Admin only)
  async reactivateUser(userId: string) {
    const user = await this.userModel.findById(userId);

    if (!user) {
      throw new NotFoundException('Không tìm thấy người dùng');
    }

    user.isActive = true;
    user.deletedAt = undefined;
    await user.save();

    return {
      message: 'Kích hoạt lại tài khoản thành công',
    };
  }

  async uploadAvatar(userId: string, file: Express.Multer.File) {
    const user = await this.userModel.findById(userId);

    if (!user) {
      throw new NotFoundException('Không tìm thấy người dùng');
    }

    // Delete old avatar if exists
    if (user.avatarUrl) {
      await this.uploadService.deleteImage(user.avatarUrl);
    }

    // Upload new avatar
    const avatarUrl = await this.uploadService.uploadAvatar(file);

    // Update user
    user.avatarUrl = avatarUrl;
    await user.save();

    return {
      message: 'Cập nhật avatar thành công',
      avatarUrl,
    };
  }

  // Delete avatar
  async deleteAvatar(userId: string) {
    const user = await this.userModel.findById(userId);

    if (!user) {
      throw new NotFoundException('Không tìm thấy người dùng');
    }

    if (!user.avatarUrl) {
      throw new BadRequestException('Người dùng chưa có avatar');
    }

    // Delete from Cloudinary
    await this.uploadService.deleteImage(user.avatarUrl);

    // Update user
    user.avatarUrl = undefined;
    await user.save();

    return {
      message: 'Xóa avatar thành công',
    };
  }
}
