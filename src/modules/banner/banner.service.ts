import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Banner } from '../../entities/banner.entity';

@Injectable()
export class BannerService {
  constructor(
    @InjectRepository(Banner)
    private readonly bannerRepository: Repository<Banner>,
  ) {}

  async onModuleInit() {
    const count = await this.bannerRepository.count();
    if (count > 0) {
      return;
    }

    await this.bannerRepository.save([
      {
        title: '新人福利',
        imageUrl: 'https://picsum.photos/seed/banner1/800/300',
        linkType: 1,
        linkTarget: '1',
        sort: 1,
        status: 1,
        startAt: new Date(),
        endAt: new Date(Date.now() + 86400000 * 30),
      },
      {
        title: '热门推荐',
        imageUrl: 'https://picsum.photos/seed/banner2/800/300',
        linkType: 2,
        linkTarget: '2',
        sort: 2,
        status: 1,
        startAt: new Date(),
        endAt: new Date(Date.now() + 86400000 * 30),
      },
    ]);
  }

  findAll() {
    return this.bannerRepository.find({ where: { status: 1 }, order: { sort: 'ASC' } });
  }
}
