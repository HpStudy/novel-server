import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Favorite } from '../../entities/favorite.entity';

@Injectable()
export class FavoriteService {
  constructor(
    @InjectRepository(Favorite)
    private readonly favoriteRepository: Repository<Favorite>,
  ) {}

  async addFavorite(userId: number, bookId: number) {
    const exists = await this.favoriteRepository.findOne({ where: { userId, bookId } });
    if (exists) {
      return exists;
    }

    return this.favoriteRepository.save(this.favoriteRepository.create({ userId, bookId }));
  }

  async cancelFavorite(userId: number, bookId: number) {
    const result = await this.favoriteRepository.delete({ userId, bookId });
    return { deleted: result.affected ?? 0 };
  }

  async list(userId: number) {
    return this.favoriteRepository.find({ where: { userId }, order: { createdAt: 'DESC' } });
  }

  async check(userId: number, bookId: number) {
    const item = await this.favoriteRepository.findOne({ where: { userId, bookId } });
    return { isFavorite: !!item };
  }
}
