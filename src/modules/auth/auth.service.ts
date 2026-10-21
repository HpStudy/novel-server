import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../entities/user.entity';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
  ) {}

  async validateUserByOpenId(openid: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { openid } });
  }

  async validateUserByPhone(phone: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { phone } });
  }

  async loginWithWx(openid: string, nickname = 'novel-user'): Promise<{ user: User; accessToken: string }> {
    if (!openid) {
      throw new UnauthorizedException('微信授权 code 无效');
    }

    let user = await this.userRepository.findOne({ where: { openid } });
    if (!user) {
      user = this.userRepository.create({
        openid,
        nickname,
        avatarUrl: '',
        status: 1,
        role: 0,
      });
      user = await this.userRepository.save(user);
    }

    const token = this.jwtService.sign({
      sub: user.id,
      nickname: user.nickname,
      role: user.role,
      vipLevel: user.vipLevel,
      phone: user.phone,
      avatarUrl: user.avatarUrl,
    });

    return { user, accessToken: token };
  }

  async loginWithPhone(phone: string, code: string): Promise<{ user: User; accessToken: string }> {
    if (!phone || !code) {
      throw new UnauthorizedException('手机号和验证码不能为空');
    }

    if (code !== '123456') {
      throw new UnauthorizedException('验证码错误');
    }

    let user = await this.userRepository.findOne({ where: { phone } });
    if (!user) {
      user = this.userRepository.create({
        phone,
        nickname: `用户${phone.slice(-4)}`,
        avatarUrl: '',
        status: 1,
        role: 0,
      });
      user = await this.userRepository.save(user);
    }

    const token = this.jwtService.sign({
      sub: user.id,
      nickname: user.nickname,
      role: user.role,
      vipLevel: user.vipLevel,
      phone: user.phone,
      avatarUrl: user.avatarUrl,
    });

    return { user, accessToken: token };
  }

  async profile(userId: number): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException('用户不存在');
    }
    return user;
  }

  async updateProfile(userId: number, data: Partial<User>): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException('用户不存在');
    }

    Object.assign(user, data);
    return this.userRepository.save(user);
  }

  async validateAdmin(phone: string, password: string): Promise<User> {
    if (phone === 'admin' && password === 'admin123') {
      const admin = await this.userRepository.findOne({ where: { phone: 'admin' } });
      if (admin) {
        admin.role = 1;
        await this.userRepository.save(admin);
        return admin;
      }

      const created = this.userRepository.create({
        phone: 'admin',
        nickname: '管理员',
        avatarUrl: '',
        role: 1,
        status: 1,
      });
      return this.userRepository.save(created);
    }

    throw new UnauthorizedException('管理员账号或密码错误');
  }
}
