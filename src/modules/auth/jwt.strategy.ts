import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { User } from '../../entities/user.entity';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET', 'novel-secret'),
    });
  }

  async validate(payload: any): Promise<Partial<User>> {
    return {
      id: payload.sub,
      nickname: payload.nickname,
      role: payload.role ?? 0,
      vipLevel: payload.vipLevel ?? 0,
      phone: payload.phone,
      avatarUrl: payload.avatarUrl,
    };
  }
}
