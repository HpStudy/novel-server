import { Body, Controller, Get, Put, Post, Req, UseGuards } from '@nestjs/common';
import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';

class WxLoginDto {
  @IsString()
  @MaxLength(128)
  code: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  nickname?: string;
}

class PhoneLoginDto {
  @IsString()
  @MaxLength(20)
  phone: string;

  @IsString()
  @MaxLength(10)
  code: string;
}

class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  nickname?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  avatarUrl?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  gender?: number;
}

@Controller('api/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('wx-login')
  async wxLogin(@Body() dto: WxLoginDto) {
    return this.authService.loginWithWx(dto.code, dto.nickname ?? 'novel-user');
  }

  @Post('phone-login')
  async phoneLogin(@Body() dto: PhoneLoginDto) {
    return this.authService.loginWithPhone(dto.phone, dto.code);
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  async profile(@Req() req: Request & { user: any }) {
    return this.authService.profile(req.user.id);
  }

  @Put('profile')
  @UseGuards(JwtAuthGuard)
  async updateProfile(@Req() req: Request & { user: any }, @Body() dto: UpdateProfileDto) {
    return this.authService.updateProfile(req.user.id, {
      nickname: dto.nickname,
      avatarUrl: dto.avatarUrl,
      gender: dto.gender,
    });
  }
}
