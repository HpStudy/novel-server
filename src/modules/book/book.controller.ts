import { Controller, Get, Param, Query } from '@nestjs/common';
import { BookService } from './book.service';

@Controller('api/book')
export class BookController {
  constructor(private readonly bookService: BookService) {}

  @Get('list')
  findAll(@Query('page') page?: string, @Query('limit') limit?: string, @Query('categoryId') categoryId?: string, @Query('sort') sort?: string) {
    return this.bookService.findAll({ page: Number(page), limit: Number(limit), categoryId: Number(categoryId), sort });
  }

  @Get('detail/:id')
  findOne(@Param('id') id: string) {
    return this.bookService.findOne(Number(id));
  }

  @Get('search')
  search(@Query('keyword') keyword?: string) {
    return this.bookService.search(keyword ?? '');
  }

  @Get('recommend')
  recommend() {
    return this.bookService.recommend();
  }
}
