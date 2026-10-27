import { ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import { AdminSetting } from '../../entities/admin-setting.entity';
import { Banner } from '../../entities/banner.entity';
import { Book } from '../../entities/book.entity';
import { Category } from '../../entities/category.entity';
import { Chapter } from '../../entities/chapter.entity';
import { Comment } from '../../entities/comment.entity';
import { Order } from '../../entities/order.entity';
import { User } from '../../entities/user.entity';
import { AdminService } from './admin.service';

describe('AdminService categories', () => {
  const userRepository = {};
  const bookRepository = {
    createQueryBuilder: jest.fn(),
    countBy: jest.fn(),
    manager: {
      transaction: jest.fn(),
    },
  };
  const categoryRepository = {
    find: jest.fn(),
    findOneBy: jest.fn(),
    delete: jest.fn(),
  };
  const bannerRepository = {};
  const orderRepository = {};
  const chapterRepository = {};
  const commentRepository = {};
  const settingRepository = {};
  const jwtService = {};
  const redis = {
    deleteByPrefix: jest.fn(),
    delete: jest.fn(),
  };

  const service = new AdminService(
    userRepository as Repository<User>,
    bookRepository as unknown as Repository<Book>,
    categoryRepository as unknown as Repository<Category>,
    bannerRepository as Repository<Banner>,
    orderRepository as Repository<Order>,
    chapterRepository as Repository<Chapter>,
    commentRepository as Repository<Comment>,
    settingRepository as Repository<AdminSetting>,
    jwtService as JwtService,
    redis as never,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    redis.deleteByPrefix.mockResolvedValue(undefined);
  });

  it('adds bookCount to the admin category list', async () => {
    categoryRepository.find.mockResolvedValue([
      { id: 1, name: '奇幻' },
      { id: 2, name: '都市' },
    ]);
    const queryBuilder = {
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      getRawMany: jest
        .fn()
        .mockResolvedValue([{ categoryId: 1, bookCount: '2' }]),
    };
    bookRepository.createQueryBuilder.mockReturnValue(queryBuilder);

    const result = await service.categories();

    expect(result).toEqual([
      { id: 1, name: '奇幻', bookCount: 2 },
      { id: 2, name: '都市', bookCount: 0 },
    ]);
  });

  it('rejects deleting a category that still has books when no target is given', async () => {
    categoryRepository.findOneBy.mockResolvedValue({ id: 1, name: '奇幻' });
    bookRepository.countBy.mockResolvedValue(2);

    await expect(service.deleteCategory(1)).rejects.toThrow(ConflictException);
    await expect(service.deleteCategory(1)).rejects.toThrow(
      '该分类下还有 2 本书籍',
    );
    expect(categoryRepository.delete).not.toHaveBeenCalled();
  });

  it('moves books to the target category before deleting', async () => {
    categoryRepository.findOneBy.mockImplementation(({ id }) =>
      Promise.resolve({ id, name: id === 1 ? '奇幻' : '都市' }),
    );
    bookRepository.countBy.mockResolvedValue(3);
    const manager = {
      update: jest.fn().mockResolvedValue(undefined),
      delete: jest.fn().mockResolvedValue(undefined),
    };
    bookRepository.manager.transaction.mockImplementation((callback) =>
      callback(manager),
    );

    const result = await service.deleteCategory(1, 2);

    expect(manager.update).toHaveBeenCalledWith(
      Book,
      { categoryId: 1 },
      { categoryId: 2 },
    );
    expect(manager.delete).toHaveBeenCalledWith(Category, 1);
    expect(redis.deleteByPrefix).toHaveBeenCalledWith('cache:books:');
    expect(result).toEqual({ deleted: true, reassignedBooks: 3 });
  });

  it('deletes an empty category directly', async () => {
    categoryRepository.findOneBy.mockResolvedValue({ id: 3, name: '修真' });
    bookRepository.countBy.mockResolvedValue(0);
    categoryRepository.delete.mockResolvedValue({ affected: 1 });

    const result = await service.deleteCategory(3);

    expect(categoryRepository.delete).toHaveBeenCalledWith(3);
    expect(result).toEqual({ deleted: true, reassignedBooks: 0 });
  });
});

describe('AdminService chapter number validation', () => {
  const userRepository = {};
  const bookRepository = { findOneBy: jest.fn(), update: jest.fn() };
  const categoryRepository = {};
  const bannerRepository = {};
  const orderRepository = {};
  const chapterRepository = {
    find: jest.fn(),
    findOneBy: jest.fn(),
    countBy: jest.fn(),
    createQueryBuilder: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    merge: jest.fn(),
    manager: {
      transaction: jest.fn(),
    },
  };
  const commentRepository = {};
  const settingRepository = {};
  const jwtService = {};
  const redis = {
    deleteByPrefix: jest.fn(),
    delete: jest.fn(),
  };

  const service = new AdminService(
    userRepository as Repository<User>,
    bookRepository as unknown as Repository<Book>,
    categoryRepository as Repository<Category>,
    bannerRepository as Repository<Banner>,
    orderRepository as Repository<Order>,
    chapterRepository as unknown as Repository<Chapter>,
    commentRepository as Repository<Comment>,
    settingRepository as Repository<AdminSetting>,
    jwtService as JwtService,
    redis as never,
  );

  const mockChapterQueryBuilder = (maxChapterNum = 3, wordCount = 18) => {
    const queryBuilder = {
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getRawOne: jest.fn().mockResolvedValue({ maxChapterNum, wordCount }),
    };
    chapterRepository.createQueryBuilder.mockReturnValue(queryBuilder);
    return queryBuilder;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    redis.deleteByPrefix.mockResolvedValue(undefined);
    redis.delete.mockResolvedValue(undefined);
  });

  it('rejects a chapter number that already exists in the same book', async () => {
    bookRepository.findOneBy.mockResolvedValue({ id: 54 });
    chapterRepository.find.mockResolvedValue([{ chapterNum: 1 }]);
    mockChapterQueryBuilder(3);

    await expect(
      service.createChapter({
        bookId: 54,
        chapterNum: 1,
        title: '重复章节',
        content: '正文',
      }),
    ).rejects.toThrow(
      '章节序号已存在：1，请调整章节序号后再提交（当前最大章节序号：3）',
    );
    expect(chapterRepository.save).not.toHaveBeenCalled();
  });

  it('rejects duplicated chapter numbers inside one batch payload', async () => {
    bookRepository.findOneBy.mockResolvedValue({ id: 54 });

    await expect(
      service.createChaptersBatch(54, 1, [
        { chapterNum: 9, title: '第九章', content: '内容一' },
        { chapterNum: 9, title: '第九章', content: '内容二' },
      ]),
    ).rejects.toThrow('章节序号重复：9，请修改后再提交');
    expect(chapterRepository.find).not.toHaveBeenCalled();
    expect(chapterRepository.manager.transaction).not.toHaveBeenCalled();
  });

  it('excludes the chapter being updated from the conflict check', async () => {
    chapterRepository.findOneBy.mockResolvedValue({
      id: 55,
      bookId: 54,
      chapterNum: 3,
      title: '第三章',
      content: '正文',
      wordCount: 6,
      isFree: 1,
    });
    bookRepository.findOneBy.mockResolvedValue({ id: 54 });
    chapterRepository.find.mockResolvedValue([]);
    chapterRepository.countBy.mockResolvedValue(3);
    chapterRepository.merge.mockImplementation((target, input) =>
      Object.assign(target, input),
    );
    chapterRepository.save.mockImplementation(async (chapter) => chapter);
    mockChapterQueryBuilder(7);

    const result = await service.updateChapter(55, {
      chapterNum: 7,
      title: '第七章',
    });

    expect(result.chapterNum).toBe(7);
    const where = chapterRepository.find.mock.calls[0][0].where;
    expect(where.bookId).toBe(54);
    expect(where.chapterNum.type).toBe('in');
    expect(where.chapterNum.value).toEqual([7]);
    expect(where.id.type).toBe('not');
    expect(where.id.value).toBe(55);
  });
});
