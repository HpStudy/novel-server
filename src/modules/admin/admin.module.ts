import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Banner } from '../../entities/banner.entity';
import { AdminSetting } from '../../entities/admin-setting.entity';
import { Book } from '../../entities/book.entity';
import { Category } from '../../entities/category.entity';
import { Chapter } from '../../entities/chapter.entity';
import { Comment } from '../../entities/comment.entity';
import { Order } from '../../entities/order.entity';
import { User } from '../../entities/user.entity';
import { AuthModule } from '../auth/auth.module';
import { AdminController } from './admin.controller';
import { AdminUploadController } from './admin-upload.controller';
import { AdminService } from './admin.service';

@Module({
  imports: [
    AuthModule,
    TypeOrmModule.forFeature([User, Book, Category, Banner, Order, Chapter, Comment, AdminSetting]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET', 'novel-secret'),
        signOptions: { expiresIn: '7d' },
      }),
    }),
  ],
  controllers: [AdminController, AdminUploadController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
