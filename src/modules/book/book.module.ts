import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Book } from '../../entities/book.entity';
import { Chapter } from '../../entities/chapter.entity';
import { BookController } from './book.controller';
import { BookService } from './book.service';

@Module({
  imports: [TypeOrmModule.forFeature([Book, Chapter])],
  controllers: [BookController],
  providers: [BookService],
  exports: [BookService],
})
export class BookModule {}
