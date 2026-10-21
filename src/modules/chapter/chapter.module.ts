import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Book } from '../../entities/book.entity';
import { Chapter } from '../../entities/chapter.entity';
import { Order } from '../../entities/order.entity';
import { User } from '../../entities/user.entity';
import { ChapterController } from './chapter.controller';
import { ChapterService } from './chapter.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule, TypeOrmModule.forFeature([Chapter, Book, Order, User])],
  controllers: [ChapterController],
  providers: [ChapterService],
  exports: [ChapterService],
})
export class ChapterModule {}
