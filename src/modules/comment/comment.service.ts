import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SensitiveWordService } from '../../common/sensitive-word.service';
import { Comment } from '../../entities/comment.entity';

@Injectable()
export class CommentService {
  constructor(
    @InjectRepository(Comment)
    private readonly commentRepository: Repository<Comment>,
    private readonly sensitiveWords: SensitiveWordService,
  ) {}

  async findByBookId(bookId: number) {
    return this.commentRepository.find({
      where: { bookId, status: 1 },
      order: { createdAt: 'DESC' },
    });
  }

  async addComment(
    userId: number,
    dto: { bookId: number; chapterId?: number; content: string },
  ) {
    this.sensitiveWords.assertClean(dto.content);
    const item = this.commentRepository.create({
      userId,
      bookId: dto.bookId,
      chapterId: dto.chapterId,
      content: dto.content,
      status: 1,
    });

    return this.commentRepository.save(item);
  }

  async likeComment(id: number) {
    const item = await this.commentRepository.findOne({ where: { id } });
    if (!item) {
      return null;
    }

    item.likeCount += 1;
    return this.commentRepository.save(item);
  }
}
