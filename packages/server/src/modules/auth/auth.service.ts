import { Injectable, ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User } from '../user/user.entity';
import { LoginDto, RegisterDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepo: Repository<User>,
    private jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.userRepo.findOne({ where: { phone: dto.phone } });
    if (existing) {
      throw new ConflictException('该手机号已注册');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = this.userRepo.create({
      phone: dto.phone,
      passwordHash,
      nickname: dto.nickname || `用户${dto.phone.slice(-4)}`,
    });
    await this.userRepo.save(user);

    const token = this.signToken(user);
    return {
      user: this.sanitizeUser(user),
      token,
    };
  }

  async login(dto: LoginDto) {
    const user = await this.userRepo.findOne({ where: { phone: dto.phone } });
    if (!user) {
      throw new UnauthorizedException('手机号或密码错误');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('手机号或密码错误');
    }

    const token = this.signToken(user);
    return {
      user: this.sanitizeUser(user),
      token,
    };
  }

  private signToken(user: User): string {
    const payload = { sub: user.id, phone: user.phone };
    return this.jwtService.sign(payload);
  }

  private sanitizeUser(user: User) {
    return {
      id: user.id,
      nickname: user.nickname,
      phone: user.phone,
      avatarUrl: user.avatarUrl,
      vipLevel: user.vipLevel,
      vipExpireTime: user.vipExpireTime,
    };
  }
}
