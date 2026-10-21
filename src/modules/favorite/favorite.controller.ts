import { Controller, Delete, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { FavoriteService } from './favorite.service';

@Controller('api/favorite')
@UseGuards(JwtAuthGuard)
export class FavoriteController {
  constructor(private readonly favoriteService: FavoriteService) {}

  @Post('add')
  add(@Req() req: Request & { user: any }, @Query('bookId') bookId: string) {
    return this.favoriteService.addFavorite(req.user.id, Number(bookId));
  }

  @Delete('cancel')
  cancel(@Req() req: Request & { user: any }, @Query('bookId') bookId: string) {
    return this.favoriteService.cancelFavorite(req.user.id, Number(bookId));
  }

  @Get('list')
  list(@Req() req: Request & { user: any }) {
    return this.favoriteService.list(req.user.id);
  }

  @Get('check/:bookId')
  check(@Req() req: Request & { user: any }, @Param('bookId') bookId: string) {
    return this.favoriteService.check(req.user.id, Number(bookId));
  }
}
