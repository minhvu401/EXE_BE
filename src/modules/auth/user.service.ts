/* eslint-disable @typescript-eslint/no-unsafe-member-access */
// user.service.ts
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from '../auth/schemas/user.schema';
import { UpdateStudentProfileDto } from './dto/update-profile.dto';
import { UpdateClubProfileDto } from './dto/update-profile.dto';
import { Role } from '../auth/enum/role.enum';
import { UserPayload } from './interface/user-payload.interface';

@Injectable()
export class UserService {
  constructor(@InjectModel(User.name) private userModel: Model<User>) {}

  // Get user profile by ID
  async getUserProfile(userId: string) {
    const user = await this.userModel
      .findById(userId)
      .select('-password')
      .exec();

    if (!user) {
      throw new NotFoundException('Không tìm thấy người dùng');
    }

    return user;
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
}
