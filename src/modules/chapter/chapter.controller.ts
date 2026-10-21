import { Controller, Get, Param, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ChapterService } from './chapter.service';

@Controller('api/chapter')
export class ChapterController {
  constructor(private readonly chapterService: ChapterService) {}

  @Get('list/:bookId')
  list(@Param('bookId') bookId: string) {
    return this.chapterService.findListByBookId(Number(bookId));
  }

  @Get('content/:id')
  async content(@Param('id') id: string, @Req() req: Request & { user?: any }) {
    const result = await this.chapterService.findContentById(Number(id), req.user);
    return result.chapter;
  }
}
