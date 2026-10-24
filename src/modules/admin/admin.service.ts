import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThanOrEqual, Repository } from 'typeorm';
import { Book } from '../../entities/book.entity';
import { User } from '../../entities/user.entity';
import { Category } from '../../entities/category.entity';
import { Banner } from '../../entities/banner.entity';
import { Order } from '../../entities/order.entity';
import { Chapter } from '../../entities/chapter.entity';
import { Comment } from '../../entities/comment.entity';
import { AdminSetting } from '../../entities/admin-setting.entity';
import { JwtService } from '@nestjs/jwt';
import { RedisService } from '../../common/redis.service';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Book)
    private readonly bookRepository: Repository<Book>,
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    @InjectRepository(Banner)
    private readonly bannerRepository: Repository<Banner>,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(Chapter)
    private readonly chapterRepository: Repository<Chapter>,
    @InjectRepository(Comment)
    private readonly commentRepository: Repository<Comment>,
    @InjectRepository(AdminSetting)
    private readonly settingRepository: Repository<AdminSetting>,
    private readonly jwtService: JwtService,
    private readonly redis: RedisService,
  ) {}

  async login(phone: string, password: string) {
    if (phone !== 'admin' || password !== 'admin123') {
      throw new UnauthorizedException('管理员账号或密码错误');
    }

    let adminUser = await this.userRepository.findOne({
      where: { phone: 'admin' },
    });
    if (!adminUser) {
      const created = this.userRepository.create({
        phone: 'admin',
        nickname: '管理员',
        role: 1,
        status: 1,
      });
      adminUser = await this.userRepository.save(created);
    } else if (adminUser.role !== 1) {
      adminUser.role = 1;
      adminUser = await this.userRepository.save(adminUser);
    }

    const token = this.jwtService.sign({
      sub: adminUser.id,
      nickname: adminUser.nickname,
      role: 'admin',
    });
    return { accessToken: token };
  }

  async users() {
    return this.userRepository.find({ order: { createdAt: 'DESC' }, take: 50 });
  }

  async toggleUserStatus(id: number) {
    const user = await this.userRepository.findOneBy({ id });
    if (!user) {
      throw new NotFoundException('用户不存在');
    }
    user.status = user.status === 1 ? 0 : 1;
    return this.userRepository.save(user);
  }

  async updateUserVip(id: number, vipLevel: number) {
    const user = await this.userRepository.findOneBy({ id });
    if (!user) {
      throw new NotFoundException('用户不存在');
    }
    user.vipLevel = vipLevel;
    return this.userRepository.save(user);
  }

  async orders() {
    return this.orderRepository.find({
      order: { createdAt: 'DESC' },
      take: 50,
    });
  }

  async comments() {
    const [comments, users, books] = await Promise.all([
      this.commentRepository.find({ order: { createdAt: 'DESC' }, take: 200 }),
      this.userRepository.find({ select: { id: true, nickname: true } }),
      this.bookRepository.find({ select: { id: true, title: true } }),
    ]);
    const userNames = new Map(
      users.map((user) => [String(user.id), user.nickname]),
    );
    const bookTitles = new Map(
      books.map((book) => [String(book.id), book.title]),
    );

    return comments.map((comment) => ({
      id: comment.id,
      user: userNames.get(String(comment.userId)) || `用户 ${comment.userId}`,
      book: bookTitles.get(String(comment.bookId)) || `书籍 ${comment.bookId}`,
      content: comment.content,
      likes: comment.likeCount,
      createdAt: comment.createdAt,
      status: comment.status,
    }));
  }

  async toggleCommentStatus(id: number) {
    const comment = await this.commentRepository.findOneBy({ id });
    if (!comment) {
      throw new NotFoundException('评论不存在');
    }
    comment.status = comment.status === 1 ? 0 : 1;
    return this.commentRepository.save(comment);
  }

  async settings() {
    const records = await this.settingRepository.find();
    const settings = Object.fromEntries(
      records.map((item) => [item.settingKey, item.settingValue]),
    );
    return {
      siteName: settings.siteName ?? '小说阅读平台',
      contact: settings.contact ?? '400-888-8888',
      email: settings.email ?? 'admin@novel.com',
      version: settings.version ?? 'v1.0.0',
    };
  }

  async updateSettings(settings: {
    siteName: string;
    contact: string;
    email: string;
    version: string;
  }) {
    await this.settingRepository.upsert(
      Object.entries(settings).map(([settingKey, settingValue]) => ({
        settingKey,
        settingValue,
      })),
      ['settingKey'],
    );
    return this.settings();
  }

  async stats() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const trendStart = new Date(today);
    trendStart.setDate(trendStart.getDate() - 6);
    const toDateKey = (date: Date) => {
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${date.getFullYear()}-${month}-${day}`;
    };
    const [
      users,
      books,
      orders,
      categories,
      todayOrders,
      revenueResult,
      trendRows,
      categoryRows,
    ] = await Promise.all([
      this.userRepository.count(),
      this.bookRepository.count(),
      this.orderRepository.count(),
      this.categoryRepository.count(),
      this.orderRepository.count({
        where: { createdAt: MoreThanOrEqual(today) },
      }),
      this.orderRepository
        .createQueryBuilder('order')
        .select('COALESCE(SUM(order.amount), 0)', 'revenue')
        .where('order.status = :status', { status: 1 })
        .andWhere('order.paidAt >= :today', { today })
        .getRawOne<{ revenue: string }>(),
      this.orderRepository
        .createQueryBuilder('order')
        .select("DATE_FORMAT(order.createdAt, '%Y-%m-%d')", 'day')
        .addSelect('COUNT(order.id)', 'count')
        .where('order.createdAt >= :trendStart', { trendStart })
        .groupBy('day')
        .getRawMany<{ day: string; count: string }>(),
      this.categoryRepository
        .createQueryBuilder('category')
        .leftJoin(Book, 'book', 'book.categoryId = category.id')
        .select('category.name', 'name')
        .addSelect('COUNT(book.id)', 'value')
        .groupBy('category.id')
        .getRawMany<{ name: string; value: string }>(),
    ]);

    const orderCounts = new Map(
      trendRows.map((row) => [row.day, Number(row.count)]),
    );
    const orderTrend = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(trendStart);
      date.setDate(trendStart.getDate() + index);
      return orderCounts.get(toDateKey(date)) || 0;
    });

    return {
      totalBooks: books,
      totalUsers: users,
      todayOrders,
      todayRevenue: Number(revenueResult?.revenue) || 0,
      orderTrend,
      categoryRatio: categoryRows.map((row) => ({
        name: row.name,
        value: Number(row.value),
      })),
      totalOrders: orders,
      totalCategories: categories,
    };
  }

  banners() {
    return this.bannerRepository.find({
      order: { sort: 'ASC', id: 'DESC' },
    });
  }

  async createBanner(input: Partial<Banner>) {
    const banner = this.bannerRepository.create(input);
    return this.bannerRepository.save(banner);
  }

  async updateBanner(id: number, input: Partial<Banner>) {
    const banner = await this.bannerRepository.findOneBy({ id });
    if (!banner) {
      throw new NotFoundException('Banner 不存在');
    }

    this.bannerRepository.merge(banner, input);
    return this.bannerRepository.save(banner);
  }

  async deleteBanner(id: number) {
    const result = await this.bannerRepository.delete(id);
    if (!result.affected) {
      throw new NotFoundException('Banner 不存在');
    }

    return { deleted: true };
  }

  books() {
    return this.bookRepository.find({ order: { createdAt: 'DESC' } });
  }

  async book(id: number) {
    const book = await this.bookRepository.findOneBy({ id });
    if (!book) {
      throw new NotFoundException('书籍不存在');
    }
    return book;
  }

  async createBook(input: Partial<Book>) {
    await this.ensureCategoryExists(input.categoryId);
    const book = await this.bookRepository.save(
      this.bookRepository.create(input),
    );
    await this.clearBookCaches();
    return book;
  }

  async updateBook(id: number, input: Partial<Book>) {
    const book = await this.book(id);
    if (input.categoryId !== undefined) {
      await this.ensureCategoryExists(input.categoryId);
    }

    this.bookRepository.merge(book, input);
    const updated = await this.bookRepository.save(book);
    await this.clearBookCaches();
    return updated;
  }

  async deleteBook(id: number) {
    const result = await this.bookRepository.delete(id);
    if (!result.affected) {
      throw new NotFoundException('书籍不存在');
    }
    await this.clearBookCaches();
    return { deleted: true };
  }

  chapters() {
    return this.chapterRepository.find({
      order: { bookId: 'ASC', chapterNum: 'ASC' },
    });
  }

  async chapter(id: number) {
    const chapter = await this.chapterRepository.findOneBy({ id });
    if (!chapter) {
      throw new NotFoundException('章节不存在');
    }
    return chapter;
  }

  async createChapter(input: Partial<Chapter>) {
    const book = await this.bookRepository.findOneBy({ id: input.bookId });
    if (!book) {
      throw new NotFoundException('所属书籍不存在');
    }

    const chapter = await this.chapterRepository.save(
      this.chapterRepository.create(input),
    );
    await this.refreshBookChapterStats(book.id);
    await this.clearBookCaches(book.id);
    return chapter;
  }

  async createChaptersBatch(
    bookId: number,
    isFree: number,
    chapters: Array<{
      chapterNum: number;
      title: string;
      content: string;
      wordCount?: number;
    }>,
  ) {
    const book = await this.bookRepository.findOneBy({ id: bookId });
    if (!book) {
      throw new NotFoundException('所属书籍不存在');
    }

    const savedChapters = await this.chapterRepository.manager.transaction(
      async (manager) => {
        const repository = manager.getRepository(Chapter);
        return repository.save(
          chapters.map((chapter) =>
            repository.create({
              ...chapter,
              bookId,
              isFree,
              wordCount: chapter.wordCount ?? 0,
            }),
          ),
        );
      },
    );
    await this.refreshBookChapterStats(bookId);
    await this.clearBookCaches(bookId);
    return savedChapters;
  }

  async updateChapter(id: number, input: Partial<Chapter>) {
    const chapter = await this.chapter(id);
    const oldBookId = chapter.bookId;
    const bookId = input.bookId ?? oldBookId;
    const book = await this.bookRepository.findOneBy({ id: bookId });
    if (!book) {
      throw new NotFoundException('所属书籍不存在');
    }

    this.chapterRepository.merge(chapter, input);
    const savedChapter = await this.chapterRepository.save(chapter);
    await this.refreshBookChapterStats(oldBookId);
    if (bookId !== oldBookId) {
      await this.refreshBookChapterStats(bookId);
    }
    await this.clearBookCaches(oldBookId, bookId);
    return savedChapter;
  }

  async deleteChapter(id: number) {
    const chapter = await this.chapter(id);
    await this.chapterRepository.delete(id);
    await this.refreshBookChapterStats(chapter.bookId);
    await this.clearBookCaches(chapter.bookId);
    return { deleted: true };
  }

  categories() {
    return this.categoryRepository.find({ order: { sort: 'ASC', id: 'ASC' } });
  }

  async category(id: number) {
    const category = await this.categoryRepository.findOneBy({ id });
    if (!category) {
      throw new NotFoundException('分类不存在');
    }
    return category;
  }

  async createCategory(input: Partial<Category>) {
    return this.categoryRepository.save(this.categoryRepository.create(input));
  }

  async updateCategory(id: number, input: Partial<Category>) {
    const category = await this.category(id);
    this.categoryRepository.merge(category, input);
    return this.categoryRepository.save(category);
  }

  async deleteCategory(id: number) {
    const category = await this.category(id);
    const bookCount = await this.bookRepository.countBy({
      categoryId: category.id,
    });
    if (bookCount > 0) {
      throw new ConflictException('该分类下仍有书籍，不能删除');
    }

    await this.categoryRepository.delete(id);
    return { deleted: true };
  }

  private async ensureCategoryExists(categoryId?: number) {
    if (categoryId === undefined) {
      throw new NotFoundException('分类不存在');
    }
    const exists = await this.categoryRepository.exist({
      where: { id: categoryId },
    });
    if (!exists) {
      throw new NotFoundException('分类不存在');
    }
  }

  private async refreshBookChapterStats(bookId: number) {
    const [chapterCount, result] = await Promise.all([
      this.chapterRepository.countBy({ bookId }),
      this.chapterRepository
        .createQueryBuilder('chapter')
        .select('COALESCE(SUM(chapter.wordCount), 0)', 'wordCount')
        .where('chapter.bookId = :bookId', { bookId })
        .getRawOne<{ wordCount: string }>(),
    ]);

    await this.bookRepository.update(bookId, {
      chapterCount,
      wordCount: Number(result?.wordCount ?? 0),
    });
  }

  private async clearBookCaches(...bookIds: number[]) {
    await Promise.all([
      this.redis.deleteByPrefix('cache:books:'),
      ...bookIds.map((bookId) =>
        this.redis.delete(`cache:chapters:list:${bookId}`),
      ),
    ]);
  }
}
