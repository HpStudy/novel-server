import { ForbiddenException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Book } from '../../entities/book.entity';
import { Chapter } from '../../entities/chapter.entity';
import { Order } from '../../entities/order.entity';
import { User } from '../../entities/user.entity';
import { ChapterService } from './chapter.service';

describe('ChapterService', () => {
  const chapterRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
  } as unknown as Repository<Chapter>;
  const bookRepository = {
    findOne: jest.fn(),
  } as unknown as Repository<Book>;
  const orderRepository = {
    exist: jest.fn(),
  } as unknown as Repository<Order>;
  const userRepository = {
    findOne: jest.fn(),
  } as unknown as Repository<User>;
  const service = new ChapterService(
    chapterRepository,
    bookRepository,
    orderRepository,
    userRepository,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns the chapter list without chapter content', async () => {
    (chapterRepository.find as jest.Mock).mockResolvedValue([]);

    await service.findListByBookId(7);

    expect(chapterRepository.find).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { bookId: 7, status: 1 },
        select: expect.not.objectContaining({ content: true }),
      }),
    );
  });

  it('allows a user with a paid order to read a paid chapter', async () => {
    const chapter = {
      id: 15,
      bookId: 7,
      chapterNum: 11,
      isFree: 0,
    } as Chapter;
    const book = { id: 7, isVip: 1, freeChapters: 10 } as Book;
    (chapterRepository.findOne as jest.Mock).mockResolvedValue(chapter);
    (bookRepository.findOne as jest.Mock).mockResolvedValue(book);
    (userRepository.findOne as jest.Mock).mockResolvedValue({
      id: 3,
      vipLevel: 0,
      vipExpireAt: null,
    });
    (orderRepository.exist as jest.Mock).mockResolvedValue(true);

    const result = await service.findContentById(15, { id: 3 });

    expect(result.chapter).toBe(chapter);
  });

  it('rejects a logged-in user without VIP or a paid order', async () => {
    (chapterRepository.findOne as jest.Mock).mockResolvedValue({
      id: 15,
      bookId: 7,
      chapterNum: 11,
      isFree: 0,
    });
    (bookRepository.findOne as jest.Mock).mockResolvedValue({
      id: 7,
      isVip: 1,
      freeChapters: 10,
    });
    (userRepository.findOne as jest.Mock).mockResolvedValue({
      id: 3,
      vipLevel: 0,
      vipExpireAt: null,
    });
    (orderRepository.exist as jest.Mock).mockResolvedValue(false);

    await expect(service.findContentById(15, { id: 3 })).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });
});
