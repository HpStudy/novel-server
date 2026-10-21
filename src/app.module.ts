import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './modules/auth/auth.module';
import { BannerModule } from './modules/banner/banner.module';
import { BookModule } from './modules/book/book.module';
import { CategoryModule } from './modules/category/category.module';
import { ChapterModule } from './modules/chapter/chapter.module';
import { CommentModule } from './modules/comment/comment.module';
import { FavoriteModule } from './modules/favorite/favorite.module';
import { OrderModule } from './modules/order/order.module';
import { ReadModule } from './modules/read/read.module';
import { AdminModule } from './modules/admin/admin.module';
import { User } from './entities/user.entity';
import { Book } from './entities/book.entity';
import { Category } from './entities/category.entity';
import { Chapter } from './entities/chapter.entity';
import { Favorite } from './entities/favorite.entity';
import { ReadHistory } from './entities/read-history.entity';
import { Comment } from './entities/comment.entity';
import { Order } from './entities/order.entity';
import { Banner } from './entities/banner.entity';
import { AdminSetting } from './entities/admin-setting.entity';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'mysql' as const,
        host: configService.get<string>('DB_HOST', '127.0.0.1'),
        port: configService.get<number>('DB_PORT', 3306),
        username: configService.get<string>('DB_USERNAME', 'root'),
        password: configService.get<string>('DB_PASSWORD', ''),
        database: configService.get<string>('DB_DATABASE', 'novel_platform'),
        charset: 'utf8mb4',
        entities: [User, Book, Category, Chapter, Favorite, ReadHistory, Comment, Order, Banner, AdminSetting],
        synchronize: configService.get<string>('DB_SYNCHRONIZE', 'true') === 'true',
        logging: configService.get<string>('DB_LOGGING', 'false') === 'true',
      }),
    }),
    AuthModule,
    CategoryModule,
    BookModule,
    ChapterModule,
    FavoriteModule,
    ReadModule,
    CommentModule,
    OrderModule,
    BannerModule,
    AdminModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
