import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Book } from '../../entities/book.entity';
import { Chapter } from '../../entities/chapter.entity';
import { Order } from '../../entities/order.entity';
import { User } from '../../entities/user.entity';

@Injectable()
export class ChapterService {
  constructor(
    @InjectRepository(Chapter)
    private readonly chapterRepository: Repository<Chapter>,
    @InjectRepository(Book)
    private readonly bookRepository: Repository<Book>,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async findListByBookId(bookId: number) {
    return this.chapterRepository.find({
      where: { bookId, status: 1 },
      order: { chapterNum: 'ASC' },
      select: {
        id: true,
        bookId: true,
        chapterNum: true,
        title: true,
        wordCount: true,
        isFree: true,
        status: true,
        createdAt: true,
        publishedAt: true,
      },
    });
  }

  async findContentById(id: number, user?: { id?: number }) {
    const chapter = await this.chapterRepository.findOne({ where: { id, status: 1 } });
    if (!chapter) {
      throw new NotFoundException('章节不存在');
    }

    const book = await this.bookRepository.findOne({ where: { id: chapter.bookId } });
    if (!book) {
      throw new NotFoundException('书籍不存在');
    }

    const isFree = chapter.isFree === 1 || (book.isVip === 0 && chapter.chapterNum <= book.freeChapters);
    if (isFree) {
      return { chapter, book };
    }

    if (user?.id) {
      const [currentUser, hasPaidOrder] = await Promise.all([
        this.userRepository.findOne({
          where: { id: user.id },
          select: { id: true, vipLevel: true, vipExpireAt: true },
        }),
        this.orderRepository.exist({
          where: {
            userId: user.id,
            type: 1,
            targetId: chapter.id,
            status: 1,
          },
        }),
      ]);
      const vipActive =
        currentUser != null &&
        (currentUser.vipLevel ?? 0) > 0 &&
        currentUser.vipExpireAt != null &&
        currentUser.vipExpireAt.getTime() > Date.now();
      if (vipActive || hasPaidOrder) {
        return { chapter, book };
      }
    }

    throw new ForbiddenException('当前章节需要付费后才能阅读');
  }
}
