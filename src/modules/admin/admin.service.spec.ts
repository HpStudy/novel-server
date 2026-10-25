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
