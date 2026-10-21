import { Controller, Get } from '@nestjs/common';
import { BannerService } from './banner.service';

@Controller('api/banner')
export class BannerController {
  constructor(private readonly bannerService: BannerService) {}

  @Get('list')
  list() {
    return this.bannerService.findAll();
  }
}
