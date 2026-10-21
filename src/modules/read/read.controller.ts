import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { IsInt, Max, Min } from 'class-validator';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ReadService } from './read.service';

class SaveProgressDto {
  @IsInt()
  @Min(1)
  bookId: number;

  @IsInt()
  @Min(1)
  chapterId: number;

  @IsInt()
  @Min(0)
  @Max(100)
  progress: number;
}

@Controller('api/read')
@UseGuards(JwtAuthGuard)
export class ReadController {
  constructor(private readonly readService: ReadService) {}

  @Post('save')
  save(@Req() req: Request & { user: any }, @Body() dto: SaveProgressDto) {
    return this.readService.saveProgress(req.user.id, dto);
  }

  @Get('history')
  history(@Req() req: Request & { user: any }) {
    return this.readService.findHistory(req.user.id);
  }
}
