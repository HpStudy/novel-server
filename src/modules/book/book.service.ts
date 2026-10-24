import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Book } from '../../entities/book.entity';
import { Chapter } from '../../entities/chapter.entity';
import { RedisService } from '../../common/redis.service';

@Injectable()
export class BookService {
  constructor(
    @InjectRepository(Book)
    private readonly bookRepository: Repository<Book>,
    @InjectRepository(Chapter)
    private readonly chapterRepository: Repository<Chapter>,
    private readonly redis: RedisService,
  ) {}

  async onModuleInit() {
    const count = await this.bookRepository.count();
    if (count > 0) {
      return;
    }

    const sampleBooks = this.bookRepository.create([
      {
        categoryId: 1,
        title: '天道图鉴',
        author: '林海',
        coverUrl: 'https://picsum.photos/seed/book1/300/400',
        description: '一位少年在修仙世界中崛起，踏上追寻天道的旅程。',
        tags: '修仙,热血,成长',
        wordCount: 120000,
        chapterCount: 3,
        status: 1,
        isVip: 0,
        pricePerChapter: 1.0,
        freeChapters: 2,
        readCount: 12000,
        score: 9.2,
      },
      {
        categoryId: 2,
        title: '都市最强修罗',
        author: '韩岩',
        coverUrl: 'https://picsum.photos/seed/book2/300/400',
        description: '都市中，一名天才青年逆袭，带领家族重走巅峰。',
        tags: '都市,热血,逆袭',
        wordCount: 98000,
        chapterCount: 3,
        status: 1,
        isVip: 1,
        pricePerChapter: 2.5,
        freeChapters: 2,
        readCount: 9800,
        score: 8.9,
      },
    ]);

    const savedBooks = await this.bookRepository.save(sampleBooks);

    await this.chapterRepository.save([
      {
        bookId: savedBooks[0].id,
        chapterNum: 1,
        title: '第一章 觉醒',
        content: '天边云雾缭绕，少年扶着石桌缓缓醒来，体内灵力悄然觉醒。',
        wordCount: 1800,
        isFree: 1,
        status: 1,
        publishedAt: new Date(),
      },
      {
        bookId: savedBooks[0].id,
        chapterNum: 2,
        title: '第二章 试炼',
        content: '试炼山谷中，天雷压顶，少年借力化解危机，命运从此改变。',
        wordCount: 2200,
        isFree: 1,
        status: 1,
        publishedAt: new Date(),
      },
      {
        bookId: savedBooks[1].id,
        chapterNum: 1,
        title: '第一章 崛起',
        content: '深夜的高楼上，韩凡看着天上的星光，决定把自己的命运掰回正轨。',
        wordCount: 2100,
        isFree: 1,
        status: 1,
        publishedAt: new Date(),
      },
      {
        bookId: savedBooks[1].id,
        chapterNum: 2,
        title: '第二章 争斗',
        content: '一场高层会议上，韩凡揭开了自己家族背后隐藏的真相。',
        wordCount: 2500,
        isFree: 0,
        status: 1,
        publishedAt: new Date(),
      },
    ]);
  }

  async findAll(query: { page?: number; limit?: number; categoryId?: number; sort?: string }) {
    const page = Number.isInteger(query.page) && Number(query.page) > 0 ? Number(query.page) : 1;
    const limit = Number.isInteger(query.limit) && Number(query.limit) > 0
      ? Math.min(Number(query.limit), 100)
      : 10;
    const categoryId = query.categoryId ? Number(query.categoryId) : undefined;
    const cacheKey = `cache:books:list:${page}:${limit}:${categoryId ?? 'all'}:${query.sort ?? 'hot'}`;
    const cached = await this.redis.get<{ items: Book[]; total: number; page: number; limit: number }>(cacheKey);
    if (cached) {
      return cached;
    }

    const qb = this.bookRepository.createQueryBuilder('book');
    qb.where('book.status = :status', { status: 1 });

    if (categoryId) {
      qb.andWhere('book.categoryId = :categoryId', { categoryId });
    }

    if (query.sort === 'hot') {
      qb.orderBy('book.readCount', 'DESC');
    } else if (query.sort === 'new') {
      qb.orderBy('book.createdAt', 'DESC');
    } else {
      qb.orderBy('book.readCount', 'DESC');
    }

    const [items, total] = await qb.take(limit).skip((page - 1) * limit).getManyAndCount();

    const result = { items, total, page, limit };
    await this.redis.set(cacheKey, result, 60);
    return result;
  }

  async findOne(id: number) {
    const book = await this.bookRepository.findOne({ where: { id, status: 1 } });
    if (!book) {
      throw new NotFoundException('书籍不存在');
    }
    return book;
  }

  async search(keyword: string) {
    return this.bookRepository
      .createQueryBuilder('book')
      .where('book.status = :status', { status: 1 })
      .andWhere('(book.title LIKE :keyword OR book.author LIKE :keyword OR book.description LIKE :keyword)', {
        keyword: `%${keyword}%`,
      })
      .orderBy('book.readCount', 'DESC')
      .getMany();
  }

  async recommend() {
    const key = 'cache:books:recommend';
    const cached = await this.redis.get<Book[]>(key);
    if (cached) {
      return cached;
    }
    const books = await this.bookRepository.find({
      where: { status: 1 },
      order: { readCount: 'DESC' },
      take: 6,
    });
    await this.redis.set(key, books, 60);
    return books;
  }
}
