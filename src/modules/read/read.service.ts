import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ReadHistory } from '../../entities/read-history.entity';

@Injectable()
export class ReadService {
  constructor(
    @InjectRepository(ReadHistory)
    private readonly readHistoryRepository: Repository<ReadHistory>,
  ) {}

  async saveProgress(userId: number, dto: { bookId: number; chapterId: number; progress: number }) {
    const existing = await this.readHistoryRepository.findOne({ where: { userId, bookId: dto.bookId } });
    if (existing) {
      existing.chapterId = dto.chapterId;
      existing.progress = dto.progress;
      return this.readHistoryRepository.save(existing);
    }

    return this.readHistoryRepository.save(
      this.readHistoryRepository.create({
        userId,
        bookId: dto.bookId,
        chapterId: dto.chapterId,
        progress: dto.progress,
      }),
    );
  }

  async findHistory(userId: number) {
    return this.readHistoryRepository.find({ where: { userId }, order: { updatedAt: 'DESC' } });
  }
}
