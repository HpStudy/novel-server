import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from '../../entities/category.entity';

@Injectable()
export class CategoryService {
  constructor(
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
  ) {}

  async onModuleInit() {
    const count = await this.categoryRepository.count();
    if (count > 0) {
      return;
    }

    await this.categoryRepository.save([
      { name: '奇幻', icon: '🔥', sort: 1, status: 1 },
      { name: '都市', icon: '🏙️', sort: 2, status: 1 },
      { name: '修真', icon: '🌿', sort: 3, status: 1 },
      { name: '历史', icon: '🏛️', sort: 4, status: 1 },
    ]);
  }

  findAll() {
    return this.categoryRepository.find({ where: { status: 1 }, order: { sort: 'ASC' } });
  }
}
