import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private userRepo: Repository<User>,
  ) {}

  async getProfile(userId: number) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('用户不存在');
    }
    return {
      id: user.id,
      nickname: user.nickname,
      phone: user.phone,
      avatarUrl: user.avatarUrl,
      vipLevel: user.vipLevel,
      vipExpireTime: user.vipExpireTime,
      createdAt: user.createdAt,
    };
  }

  async updateProfile(userId: number, data: { nickname?: string; avatarUrl?: string }) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('用户不存在');
    }
    if (data.nickname !== undefined) user.nickname = data.nickname;
    if (data.avatarUrl !== undefined) user.avatarUrl = data.avatarUrl;
    await this.userRepo.save(user);
    return this.getProfile(userId);
  }
}
